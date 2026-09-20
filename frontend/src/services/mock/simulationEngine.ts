import { initialSnapshot } from "./seedData";
import type {
  DataSnapshot,
  DataPatch,
  Incident,
  NewIncidentInput,
  Shipment
} from "@/types/domain";

export class SimulationEngine {
  private currentSnapshot: DataSnapshot;
  private subscribers: Set<(patch: DataPatch) => void> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRainfallTriggered = false;
  private offlineMode = false;

  constructor() {
    this.currentSnapshot = JSON.parse(JSON.stringify(initialSnapshot));
    this.startSimulation();
  }

  public getSnapshot(): DataSnapshot {
    return JSON.parse(JSON.stringify(this.currentSnapshot));
  }

  public subscribe(callback: (patch: DataPatch) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public setOfflineMode(enabled: boolean) {
    this.offlineMode = enabled;
  }

  public isOffline(): boolean {
    return this.offlineMode;
  }

  private broadcast(patch: DataPatch) {
    this.subscribers.forEach((cb) => {
      try {
        cb(patch);
      } catch (err) {
        console.error("Error in simulation subscriber callback:", err);
      }
    });
  }

  private startSimulation() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.tick();
    }, 3500);
  }

  public stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick() {
    // Nudge vehicle coordinates slightly along routes to simulate real-time GPS telemetry
    const updatedVehicles = this.currentSnapshot.vehicles.map((v) => {
      if (v.status === "stopped") return v;

      // Small delta movement
      const latDelta = (Math.random() - 0.48) * 0.002;
      const lngDelta = (Math.random() - 0.48) * 0.002;
      const speedJitter = Math.floor((Math.random() - 0.5) * 4);
      const newSpeed = Math.max(20, Math.min(85, v.speedKph + speedJitter));

      return {
        ...v,
        lat: Number((v.lat + latDelta).toFixed(5)),
        lng: Number((v.lng + lngDelta).toFixed(5)),
        speedKph: v.status === "delayed" ? Math.min(newSpeed, 30) : newSpeed,
        lastUpdated: new Date().toISOString()
      };
    });

    this.currentSnapshot.vehicles = updatedVehicles;
    this.broadcast({ vehicles: updatedVehicles });
  }

  /**
   * Flagship Demo Scenario:
   * Injects intense monsoon rainfall on Meghalaya / Guwahati-Shillong corridor.
   * Flips NH-6 accessible (green) -> at_risk (amber) -> blocked (red).
   * Flags FW-18 (TRUCK-001) as delayed with high risk.
   * Generates urgent alert and prepares Route B alternate recommendation.
   */
  public async triggerDemoEvent(event: "heavy_rainfall" | "reset"): Promise<void> {
    if (event === "reset") {
      this.isRainfallTriggered = false;
      this.currentSnapshot = JSON.parse(JSON.stringify(initialSnapshot));
      this.broadcast(this.currentSnapshot);
      return;
    }

    if (this.isRainfallTriggered) return;
    this.isRainfallTriggered = true;

    // STEP 1: Rain intensifies in Shillong weather
    const updatedWeather = this.currentSnapshot.weather.map((w) => {
      if (w.location.includes("Shillong")) {
        return {
          ...w,
          rainfallMm: 148.6,
          warningLevel: "severe" as const,
          forecastSummary: "Torrential monsoon cloudburst with catastrophic slope runoff",
          timestamp: new Date().toISOString()
        };
      }
      return w;
    });
    this.currentSnapshot.weather = updatedWeather;
    this.broadcast({ weather: updatedWeather });

    // STEP 2 (after 1s): NH-6 status degrades to At Risk
    await new Promise((r) => setTimeout(r, 1200));
    let updatedRoads = this.currentSnapshot.roads.map((r) => {
      if (r.id === "NH-6") {
        return {
          ...r,
          status: "at_risk" as const,
          accessibilityScore: 54,
          floodRisk: 0.68,
          speedKph: 24,
          clearancePercent: "50%",
          description: "High water runoff over Nongpoh culverts",
          lastUpdated: new Date().toISOString()
        };
      }
      return r;
    });
    this.currentSnapshot.roads = updatedRoads;
    this.currentSnapshot.kpis.atRiskRoutes = 5;
    this.broadcast({ roads: updatedRoads, kpis: this.currentSnapshot.kpis });

    // STEP 3 (after 2s): NH-6 fully blocked by flash flooding & landslide
    await new Promise((r) => setTimeout(r, 1800));
    updatedRoads = this.currentSnapshot.roads.map((r) => {
      if (r.id === "NH-6") {
        return {
          ...r,
          status: "blocked" as const,
          accessibilityScore: 8,
          floodRisk: 0.96,
          speedKph: 0,
          clearancePercent: "0%",
          description: "Waterlogging 1.5m deep at KM 48. Total carriageway cutoff.",
          lastUpdated: new Date().toISOString()
        };
      }
      return r;
    });

    // Inundation Incident added
    const newIncident: Incident = {
      id: "INC-5001",
      title: "Flash Flood Carriageway Inundation — NH-6 Nongpoh",
      type: "flood",
      severity: "high",
      lat: 25.7200,
      lng: 91.8700,
      affectedRoadId: "NH-6",
      corridorName: "NH-6 Guwahati-Shillong KM 48",
      description: "Severe mountain flash flood overtopping highway by 1.5 meters. Traffic completely halted. Meghalaya SDRF unit deployed.",
      photoUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
      reportedBy: "Meghalaya Disaster Management Authority",
      agency: "SDMA East Khasi Hills",
      impact: "Vehicle FW-18 (Emergency Medical Consignment) stranded at KM 42.",
      createdAt: new Date().toISOString(),
      status: "verified",
      syncStatus: "synced"
    };

    // Priority Alert generated
    const newAlert = {
      id: "ALT-201",
      type: "flood_risk" as const,
      severity: "critical" as const,
      category: "weather" as const,
      title: "CRITICAL HAZARD: NH-6 Flash Flood Cutoff",
      message: "Severe flooding on NH-6 Nongpoh corridor. Medical Truck FW-18 halted. Reroute via Route B (Jowai Bypass) strongly advised.",
      relatedRoadId: "NH-6",
      relatedVehicleId: "FW-18",
      createdAt: new Date().toISOString(),
      acknowledged: false
    };

    // Vehicle FW-18 status updated
    const updatedVehicles = this.currentSnapshot.vehicles.map((v) => {
      if (v.id === "FW-18") {
        return {
          ...v,
          status: "delayed" as const,
          speedKph: 0,
          riskScore: 0.95,
          delayMinutes: 45,
          lastUpdated: new Date().toISOString()
        };
      }
      return v;
    });

    // Shipment SHP-001 updated
    const updatedShipments = this.currentSnapshot.shipments.map((s) => {
      if (s.id === "SHP-001") {
        return {
          ...s,
          status: "at_risk" as const,
          riskScore: 0.92
        };
      }
      return s;
    });

    // Route Options updated: Route A is now high risk, Route B is recommended!
    const updatedRoutes = this.currentSnapshot.routes.map((rt) => {
      if (rt.id === "ROUTE-A") {
        return {
          ...rt,
          recommended: false,
          riskScore: 0.95,
          disruptionProbability: 0.92,
          reason: "BLOCKED: NH-6 flooded at KM 48. Severe transit interruption."
        };
      }
      if (rt.id === "ROUTE-B") {
        return {
          ...rt,
          recommended: true,
          reason: "RECOMMENDED ALTERNATE: +45 min transit, 70% lower terrain disruption probability."
        };
      }
      return rt;
    });

    this.currentSnapshot.roads = updatedRoads;
    this.currentSnapshot.incidents = [newIncident, ...this.currentSnapshot.incidents];
    this.currentSnapshot.alerts = [newAlert, ...this.currentSnapshot.alerts];
    this.currentSnapshot.vehicles = updatedVehicles;
    this.currentSnapshot.shipments = updatedShipments;
    this.currentSnapshot.routes = updatedRoutes;
    this.currentSnapshot.kpis.blockedRoutes = 3;
    this.currentSnapshot.kpis.activeIncidents = this.currentSnapshot.incidents.length;

    this.broadcast({
      roads: this.currentSnapshot.roads,
      incidents: this.currentSnapshot.incidents,
      alerts: this.currentSnapshot.alerts,
      vehicles: this.currentSnapshot.vehicles,
      shipments: this.currentSnapshot.shipments,
      routes: this.currentSnapshot.routes,
      kpis: this.currentSnapshot.kpis
    });
  }

  /**
   * Handles user reroute action (Accept Route / Switch Route)
   */
  public async requestReroute(shipmentId: string, routeId: string): Promise<Shipment> {
    const shipment = this.currentSnapshot.shipments.find((s) => s.id === shipmentId);
    if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);

    const selectedRoute = this.currentSnapshot.routes.find((r) => r.id === routeId);

    // Update shipment
    shipment.currentRouteId = routeId;
    shipment.status = "on_time";
    shipment.riskScore = selectedRoute ? selectedRoute.riskScore : 0.2;
    shipment.etaIso = new Date(Date.now() + 165 * 60000).toISOString();

    // Update vehicle
    const vehicle = this.currentSnapshot.vehicles.find((v) => v.id === shipment.vehicleId);
    if (vehicle) {
      vehicle.currentRouteId = routeId;
      vehicle.status = "moving";
      vehicle.speedKph = 52;
      vehicle.riskScore = 0.2;
      vehicle.currentCorridor = "NH-27 / NH-6S Bypass";
      vehicle.lastUpdated = new Date().toISOString();
    }

    // Confirmation Alert
    const rerouteAlert = {
      id: `ALT-${Date.now()}`,
      type: "other" as const,
      severity: "info" as const,
      category: "all" as const,
      title: "REROUTE CONFIRMED",
      message: `Consignment ${shipmentId} (${shipment.commodity}) successfully switched to ${selectedRoute?.name || routeId}. Vehicle ${shipment.vehicleId} resuming transit.`,
      relatedVehicleId: shipment.vehicleId,
      createdAt: new Date().toISOString(),
      acknowledged: false
    };

    this.currentSnapshot.alerts = [rerouteAlert, ...this.currentSnapshot.alerts];

    this.broadcast({
      shipments: this.currentSnapshot.shipments,
      vehicles: this.currentSnapshot.vehicles,
      alerts: this.currentSnapshot.alerts
    });

    return JSON.parse(JSON.stringify(shipment));
  }

  /**
   * Handles field officer incident report submission
   */
  public async submitIncident(input: NewIncidentInput): Promise<Incident> {
    const isOffline = this.offlineMode;
    const newInc: Incident = {
      ...input,
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      status: "pending",
      syncStatus: isOffline ? "pending_sync" : "synced"
    };

    this.currentSnapshot.incidents = [newInc, ...this.currentSnapshot.incidents];
    this.currentSnapshot.kpis.activeIncidents = this.currentSnapshot.incidents.length;

    // Create matching alert
    const incidentAlert = {
      id: `ALT-${Date.now()}`,
      type: input.type === "flood" ? ("flood_risk" as const) : ("road_blocked" as const),
      severity: input.severity === "high" ? ("critical" as const) : ("warning" as const),
      category: "all" as const,
      title: `NEW FIELD REPORT: ${input.title}`,
      message: `${input.description} (Reported by: ${input.reportedBy || "Field Unit"})`,
      relatedRoadId: input.affectedRoadId,
      createdAt: new Date().toISOString(),
      acknowledged: false
    };

    this.currentSnapshot.alerts = [incidentAlert, ...this.currentSnapshot.alerts];

    this.broadcast({
      incidents: this.currentSnapshot.incidents,
      alerts: this.currentSnapshot.alerts,
      kpis: this.currentSnapshot.kpis
    });

    // If offline simulation was enabled, flip to synced after 3.5 seconds
    if (isOffline) {
      setTimeout(() => {
        newInc.syncStatus = "synced";
        newInc.status = "verified";
        this.broadcast({
          incidents: this.currentSnapshot.incidents
        });
      }, 3500);
    }

    return JSON.parse(JSON.stringify(newInc));
  }
}

export const simulationEngine = new SimulationEngine();
