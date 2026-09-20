import type { DataProvider } from "../dataProvider";
import type {
  DataSnapshot,
  DataPatch,
  Incident,
  NewIncidentInput,
  Shipment
} from "@/types/domain";
import { getApiConfig } from "../apiConfig";
import { initialSnapshot } from "../mock/seedData";
import {
  snapshotApi,
  incidentApi,
  shipmentApi,
  vehicleApi,
  roadApi,
  routeApi,
  alertApi,
  weatherApi,
  kpiApi,
  demoApi,
  formatAxiosError
} from "../api/apiClient";

const OFFLINE_QUEUE_KEY = "ner_pending_incidents";

/**
 * LiveApiProvider:
 * Resilient connector for the live backend REST + WebSocket API.
 * Uses centralized Axios client for all HTTP requests with:
 * - Dynamic URL resolution (supports custom backend IPs like 10.215.235.233:5000)
 * - Auto-fallback between /api/snapshot and individual REST resources
 * - Granular error extraction from Axios response errors
 * - Automatic WebSocket reconnection with exponential backoff
 * - Event-envelope normalizer for realtime patches
 * - Offline queue for incident reports with pending sync support (FR-14)
 */
export class LiveApiProvider implements DataProvider {
  private baseUrl: string;
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private subscribers: Set<(patch: DataPatch) => void> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 10000;
  private isIntentionallyClosed = false;
  private wsStatus: "connected" | "connecting" | "disconnected" = "disconnected";

  constructor() {
    const config = getApiConfig();
    this.baseUrl = config.httpUrl;
    this.wsUrl = config.wsUrl;

    // Listen for runtime connection config adjustments
    if (typeof window !== "undefined") {
      window.addEventListener("ner:apiConfigChanged", () => {
        const updated = getApiConfig();
        this.baseUrl = updated.httpUrl;
        this.wsUrl = updated.wsUrl;
        this.reconnectWebSocket();
      });
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getWsUrl(): string {
    return this.wsUrl;
  }

  public getWsStatus(): "connected" | "connecting" | "disconnected" {
    return this.wsStatus;
  }

  /**
   * Connect and fetch initial state snapshot:
   * 1. Try GET /api/snapshot (via Axios snapshotApi)
   * 2. If 404 or missing, fall back to individual REST endpoints in parallel
   * 3. Defensive unwrapping of { data: ... } or direct payload arrays
   */
  public async connect(): Promise<DataSnapshot> {
    try {
      // Step 1: Attempt consolidated snapshot via Axios
      try {
        const snapshot = await snapshotApi.getSnapshot({ timeout: 6000 });
        if (snapshot) {
          return this.normalizeSnapshot(snapshot);
        }
      } catch {
        // Fall back to querying individual endpoints if consolidated snapshot fails
      }

      // Step 2: Attempt concurrent resource endpoints via Axios
      const [
        vehicles,
        roads,
        incidents,
        shipments,
        routes,
        alerts,
        weather,
        kpis
      ] = await Promise.all([
        vehicleApi.getAll().catch(() => initialSnapshot.vehicles),
        roadApi.getAll().catch(() => initialSnapshot.roads),
        incidentApi.getAll().catch(() => initialSnapshot.incidents),
        shipmentApi.getAll().catch(() => initialSnapshot.shipments),
        routeApi.getAll().catch(() => initialSnapshot.routes),
        alertApi.getAll().catch(() => initialSnapshot.alerts),
        weatherApi.getAll().catch(() => initialSnapshot.weather),
        kpiApi.getKpis().catch(() => initialSnapshot.kpis)
      ]);

      return {
        vehicles: Array.isArray(vehicles) && vehicles.length > 0 ? vehicles : initialSnapshot.vehicles,
        roads: Array.isArray(roads) && roads.length > 0 ? roads : initialSnapshot.roads,
        incidents: Array.isArray(incidents) && incidents.length > 0 ? incidents : initialSnapshot.incidents,
        shipments: Array.isArray(shipments) && shipments.length > 0 ? shipments : initialSnapshot.shipments,
        routes: Array.isArray(routes) && routes.length > 0 ? routes : initialSnapshot.routes,
        alerts: Array.isArray(alerts) && alerts.length > 0 ? alerts : initialSnapshot.alerts,
        weather: Array.isArray(weather) && weather.length > 0 ? weather : initialSnapshot.weather,
        kpis: kpis || initialSnapshot.kpis
      };
    } catch (err: unknown) {
      const message = formatAxiosError(err, `Could not connect to live backend at ${this.baseUrl}`);
      console.warn("LiveApiProvider connect failed:", message, err);
      throw new Error(message, { cause: err });
    }
  }

  /**
   * Helper to ensure loaded snapshot has all required keys
   */
  private normalizeSnapshot(raw: unknown): DataSnapshot {
    const s = (raw && typeof raw === "object" ? raw : {}) as Partial<DataSnapshot>;
    return {
      vehicles: Array.isArray(s.vehicles) ? s.vehicles : initialSnapshot.vehicles,
      roads: Array.isArray(s.roads) ? s.roads : initialSnapshot.roads,
      incidents: Array.isArray(s.incidents) ? s.incidents : initialSnapshot.incidents,
      shipments: Array.isArray(s.shipments) ? s.shipments : initialSnapshot.shipments,
      routes: Array.isArray(s.routes) ? s.routes : initialSnapshot.routes,
      alerts: Array.isArray(s.alerts) ? s.alerts : initialSnapshot.alerts,
      weather: Array.isArray(s.weather) ? s.weather : initialSnapshot.weather,
      kpis: s.kpis || initialSnapshot.kpis
    };
  }

  /**
   * Subscribe to real-time updates via WebSocket with auto-reconnect
   */
  public subscribe(onPatch: (patch: DataPatch) => void): () => void {
    this.subscribers.add(onPatch);
    this.isIntentionallyClosed = false;

    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.initWebSocket();
    }

    return () => {
      this.subscribers.delete(onPatch);
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  private initWebSocket(): void {
    if (typeof window === "undefined" || this.isIntentionallyClosed) return;
    if (!this.wsUrl) {
      this.wsStatus = "disconnected";
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.wsStatus = "connecting";
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.wsStatus = "connected";
        this.reconnectDelay = 1000;
        // Attempt flushing offline incident queue once reconnected
        this.flushOfflineIncidentQueue().catch(() => {});
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const patch = this.normalizeRealtimeMessage(raw);
          if (patch) {
            this.subscribers.forEach((cb) => cb(patch));
          }
        } catch (e) {
          console.error("Malformed realtime patch received from WebSocket:", e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn("WebSocket stream error:", err);
      };

      this.ws.onclose = () => {
        this.wsStatus = "disconnected";
        this.ws = null;
        if (!this.isIntentionallyClosed && this.subscribers.size > 0) {
          this.scheduleReconnect();
        }
      };
    } catch (e) {
      this.wsStatus = "disconnected";
      console.warn("WebSocket initialization failed:", e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
      this.initWebSocket();
    }, this.reconnectDelay);
  }

  private reconnectWebSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.subscribers.size > 0) {
      this.initWebSocket();
    }
  }

  /**
   * Normalizes incoming WebSocket messages:
   * Handles both full DataPatch format and granular envelope events:
   * { "type": "vehicle:update", "payload": ... }
   * { "type": "road:statusChange", "payload": ... }
   */
  private normalizeRealtimeMessage(raw: unknown): DataPatch | null {
    if (!raw || typeof raw !== "object") return null;

    const msg = raw as Record<string, unknown>;

    // Direct DataPatch with domain keys
    if (
      "vehicles" in msg ||
      "roads" in msg ||
      "incidents" in msg ||
      "shipments" in msg ||
      "routes" in msg ||
      "alerts" in msg ||
      "weather" in msg ||
      "kpis" in msg
    ) {
      return msg as DataPatch;
    }

    // Granular typed event envelopes (architecture.md §4)
    const eventType = (msg.type || msg.event) as string | undefined;
    const payload = msg.payload || msg.data;

    if (!eventType || !payload) return null;

    switch (eventType) {
      case "vehicle:update":
      case "vehicles:update":
        return { vehicles: Array.isArray(payload) ? payload : [payload] } as DataPatch;
      case "road:statusChange":
      case "roads:update":
        return { roads: Array.isArray(payload) ? payload : [payload] } as DataPatch;
      case "incident:new":
      case "incidents:update":
        return { incidents: Array.isArray(payload) ? payload : [payload] } as DataPatch;
      case "shipment:update":
      case "shipments:update":
        return { shipments: Array.isArray(payload) ? payload : [payload] } as DataPatch;
      case "alert:new":
      case "alerts:update":
        return { alerts: Array.isArray(payload) ? payload : [payload] } as DataPatch;
      case "weather:update":
        return { weather: Array.isArray(payload) ? payload : [payload] } as DataPatch;
      case "kpis:update":
        return { kpis: payload } as DataPatch;
      default:
        return null;
    }
  }

  /**
   * Submit Incident to backend using Axios incidentApi with defensive error extraction
   * and automatic offline queuing if unreachable (PRD FR-14)
   */
  public async submitIncident(input: NewIncidentInput): Promise<Incident> {
    try {
      const created = await incidentApi.create(input, { timeout: 8000 });
      created.syncStatus = "synced";
      return created;
    } catch (err: unknown) {
      console.warn("Backend incident submission failed via Axios, evaluating offline fallback:", err);

      // If backend network error or unreachable, store report locally in offline queue (PRD FR-14)
      const offlineIncident: Incident = {
        ...input,
        id: `INC-OFFLINE-${Date.now().toString().slice(-4)}`,
        createdAt: new Date().toISOString(),
        status: "pending",
        syncStatus: "pending_sync"
      };

      this.queueOfflineIncident(offlineIncident);
      return offlineIncident;
    }
  }

  private queueOfflineIncident(incident: Incident): void {
    try {
      const existing = localStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue: Incident[] = existing ? JSON.parse(existing) : [];
      queue.push(incident);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error("Failed to queue offline incident in localStorage:", e);
    }
  }

  public async flushOfflineIncidentQueue(): Promise<number> {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!raw) return 0;

      const queue: Incident[] = JSON.parse(raw);
      if (queue.length === 0) return 0;

      const remaining: Incident[] = [];
      let syncedCount = 0;

      for (const item of queue) {
        try {
          const cleanInput: NewIncidentInput = {
            title: item.title,
            type: item.type,
            severity: item.severity,
            affectedRoadId: item.affectedRoadId,
            corridorName: item.corridorName,
            description: item.description,
            lat: item.lat,
            lng: item.lng,
            photoUrl: item.photoUrl,
            reportedBy: item.reportedBy,
            agency: item.agency,
            impact: item.impact
          };

          await incidentApi.create(cleanInput);
          syncedCount++;
        } catch {
          remaining.push(item);
        }
      }

      if (remaining.length > 0) {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
      }

      return syncedCount;
    } catch {
      return 0;
    }
  }

  /**
   * Request Reroute action using Axios shipmentApi with timeout and unwrapping
   */
  public async requestReroute(shipmentId: string, routeId: string): Promise<Shipment> {
    try {
      return await shipmentApi.reroute(shipmentId, routeId, { timeout: 8000 });
    } catch (err: unknown) {
      const errorMsg = formatAxiosError(err, `Reroute request failed for shipment ${shipmentId}`);
      throw new Error(errorMsg, { cause: err });
    }
  }

  /**
   * Trigger demo event on live backend using Axios demoApi
   */
  public async triggerDemoEvent(event: "heavy_rainfall" | "reset"): Promise<void> {
    try {
      await demoApi.triggerEvent(event);
    } catch (err) {
      console.warn("Backend demo trigger event was not processed by backend:", err);
    }
  }

  public disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.wsStatus = "disconnected";
    this.subscribers.clear();
  }
}

export const liveApiProvider = new LiveApiProvider();
