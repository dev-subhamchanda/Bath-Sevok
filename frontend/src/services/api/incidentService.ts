import type { AxiosRequestConfig } from "axios";
import type { Incident, NewIncidentInput, Severity } from "@/types/domain";
import { apiClient, getAdaptive, postAdaptive } from "./httpClient";

export interface BackendIncidentItem {
  _id?: string;
  id?: string;
  type: string;
  title: string;
  description?: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  roadStatus?: "OPEN" | "PARTIALLY_AVAILABLE" | "BLOCKED";
  verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
  status?: "ACTIVE" | "RESOLVED";
  source?: string;
  startedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export const mapIncidentTypeToBackend = (
  type?: string
): "ACCIDENT" | "ROAD_CLOSURE" | "CONSTRUCTION" | "WEATHER" | "TRAFFIC" | "OTHER" => {
  if (!type) return "OTHER";
  const lower = type.toLowerCase().trim();
  if (lower === "landslide" || lower === "blockade" || lower === "road_closure") return "ROAD_CLOSURE";
  if (lower === "flood" || lower === "heavy_rainfall" || lower === "weather") return "WEATHER";
  if (lower === "accident" || lower === "breakdown" || lower === "collision") return "ACCIDENT";
  if (lower === "construction" || lower === "roadwork") return "CONSTRUCTION";
  if (lower === "traffic" || lower === "congestion") return "TRAFFIC";
  return "OTHER";
};

export const mapSeverityToBackend = (severity?: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" => {
  if (!severity) return "HIGH";
  const s = severity.toLowerCase().trim();
  if (s === "critical") return "CRITICAL";
  if (s === "high") return "HIGH";
  if (s === "medium" || s === "moderate") return "MEDIUM";
  return "LOW";
};

export function transformBackendIncident(raw: BackendIncidentItem, index = 0): Incident {
  const rawId = (raw._id || raw.id || `INC-${index + 1}`).toString();
  const coords = raw.location?.coordinates || [91.7362, 26.1445]; // [lng, lat]

  const severityMap: Record<string, Severity> = {
    CRITICAL: "high",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low"
  };

  const domainSeverity: Severity = (raw.severity ? severityMap[raw.severity.toUpperCase()] : "high") || "high";
  const domainStatus: "pending" | "verified" | "resolved" =
    raw.status === "RESOLVED"
      ? "resolved"
      : raw.verificationStatus === "VERIFIED"
      ? "verified"
      : "pending";

  return {
    id: rawId,
    title: raw.title || "Road Incident",
    type: "landslide",
    severity: domainSeverity,
    affectedRoadId: "NH-6",
    corridorName: "Arterial Highway",
    description: raw.description || "Reported corridor disruption",
    lat: Number(coords[1]),
    lng: Number(coords[0]),
    photoUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
    reportedBy: raw.source || "Field Unit",
    agency: "NER Emergency Transit Cell",
    impact: `Status: ${raw.roadStatus || "PARTIALLY_AVAILABLE"}`,
    createdAt: raw.createdAt || raw.startedAt || new Date().toISOString(),
    status: domainStatus,
    syncStatus: "synced"
  };
}

/**
 * Incidents Service
 * Fully aligned with backend Incident API:
 * - Report: POST /api/v1/incidents/report
 * - Verified for AI: GET /api/v1/incidents/for-ai
 * - Verify: PATCH /api/v1/incidents/:id/verify
 */
export const incidentApi = {
  /**
   * Fetch verified active incidents from backend
   */
  async getAll(config?: AxiosRequestConfig): Promise<Incident[]> {
    try {
      const res = await getAdaptive<
        { incidents?: BackendIncidentItem[]; data?: BackendIncidentItem[] } | BackendIncidentItem[]
      >(
        "/api/v1/incidents/for-ai",
        "/incidents/for-ai",
        config
      );

      let list: BackendIncidentItem[] = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && typeof res === "object") {
        list = res.incidents || res.data || [];
      }

      if (list.length > 0) {
        return list.map((item, idx) => transformBackendIncident(item, idx));
      }
    } catch (err) {
      console.warn("[IncidentAPI] Could not fetch incidents from backend:", err);
    }

    return [];
  },

  /**
   * Submit an incident report to backend POST /api/v1/incidents/report
   */
  async create(input: NewIncidentInput, config?: AxiosRequestConfig): Promise<Incident> {
    const backendType = mapIncidentTypeToBackend(input.type);
    const backendSeverity = mapSeverityToBackend(input.severity);

    const payload = {
      type: backendType,
      title: input.title.trim(),
      description: input.description?.trim() || input.impact || "",
      location: {
        type: "Point",
        coordinates: [Number(input.lng), Number(input.lat)] // [longitude, latitude]
      },
      severity: backendSeverity,
      source: input.reportedBy || input.agency || "field-report",
      startedAt: new Date().toISOString()
    };

    const res = await postAdaptive<{ message: string; incident: BackendIncidentItem }>(
      "/api/v1/incidents/report",
      "/incidents/report",
      payload,
      config
    );

    const rawInc = res?.incident || (res as unknown as BackendIncidentItem);
    if (rawInc && typeof rawInc === "object") {
      const transformed = transformBackendIncident(rawInc);
      transformed.title = input.title;
      transformed.description = input.description;
      transformed.affectedRoadId = input.affectedRoadId;
      transformed.corridorName = input.corridorName;
      return transformed;
    }

    return {
      ...input,
      id: `INC-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
      status: "pending",
      syncStatus: "synced"
    };
  },

  /**
   * Verify an incident via PATCH /api/v1/incidents/:id/verify
   */
  async verify(incidentId: string, verifiedBy = "operator", config?: AxiosRequestConfig): Promise<unknown> {
    return apiClient.patch(`/api/v1/incidents/${incidentId}/verify`, { verifiedBy }, config);
  }
};
