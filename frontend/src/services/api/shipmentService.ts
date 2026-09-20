import axios, { type AxiosRequestConfig } from "axios";
import type { Shipment } from "@/types/domain";
import { apiClient, getAdaptive, postAdaptive } from "./httpClient";
import { routeAlternativesApi, type GeoJsonPoint } from "./routeService";
import { reverseGeocodeCoordinates } from "@/services/mock/driversData";

export interface BackendShipmentItem {
  _id?: string;
  id?: string;
  trackingNumber?: string;
  origin?: {
    type?: string;
    coordinates?: [number, number]; // [lng, lat]
  } | string;
  destination?: {
    type?: string;
    coordinates?: [number, number]; // [lng, lat]
  } | string;
  weightKg?: number;
  priority?: "HIGH" | "MEDIUM" | "LOW" | number;
  status?: string;
  loadType?: string;
  commodity?: string;
  vehicleId?: string;
  driverId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CreateShipmentInput {
  origin: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  destination: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  weightKg?: number;
  priority?: 1 | 2 | 3 | "HIGH" | "MEDIUM" | "LOW";
  loadType?: string;
  commodity?: string;
  vehicleId?: string;
  driverId?: string;
  routeId?: string;
  driverName?: string;
  driverPhone?: string;
  driverLicenseId?: string;
  driverPhotoUrl?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  status?: "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  vehicleUnit?: "heavy" | "light" | "moderate";
  fleetClassification?: "transit";
  pickupTimeIso?: string;
  expectedDeliveryIso?: string;
  receiverContact?: string;
  specialInstructions?: string;
  image?: Blob | File;
  driverPhoto?: Blob | File;
  route?: {
    distanceKm: number;
    durationMinutes: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Transforms raw backend shipment document into domain Shipment entity.
 */
export function transformBackendShipment(raw: BackendShipmentItem, index = 0): Shipment {
  const rawId = raw._id || raw.id || raw.trackingNumber || `SHP-LIVE-${index + 1}`;
  const trackingNumber = raw.trackingNumber || `NXR-${rawId.slice(-8).toUpperCase()}`;

  let originName = "Guwahati";
  let originCoords: [number, number] | undefined = undefined;
  if (raw.origin && typeof raw.origin === "object" && Array.isArray(raw.origin.coordinates)) {
    originCoords = [Number(raw.origin.coordinates[0]), Number(raw.origin.coordinates[1])];
    originName = reverseGeocodeCoordinates(originCoords[0], originCoords[1]);
  } else if (typeof raw.origin === "string") {
    originName = raw.origin;
  }

  let destName = "Shillong";
  let destCoords: [number, number] | undefined = undefined;
  if (raw.destination && typeof raw.destination === "object" && Array.isArray(raw.destination.coordinates)) {
    destCoords = [Number(raw.destination.coordinates[0]), Number(raw.destination.coordinates[1])];
    destName = reverseGeocodeCoordinates(destCoords[0], destCoords[1]);
  } else if (typeof raw.destination === "string") {
    destName = raw.destination;
  }

  const priorityNum: 1 | 2 | 3 =
    raw.priority === "HIGH" || raw.priority === 1
      ? 1
      : raw.priority === "MEDIUM" || raw.priority === 2
      ? 2
      : 3;

  const statusMap: Record<string, "on_time" | "at_risk" | "delayed" | "delivered"> = {
    PENDING: "on_time",
    IN_TRANSIT: "on_time",
    ON_TIME: "on_time",
    AT_RISK: "at_risk",
    DELAYED: "delayed",
    DELIVERED: "delivered"
  };
  const normalizedStatus = (raw.status ? statusMap[raw.status.toUpperCase()] : "on_time") || "on_time";

  return {
    id: rawId,
    rawBackendId: raw._id,
    trackingNumber,
    origin: originName,
    destination: destName,
    originCoordinates: originCoords,
    destinationCoordinates: destCoords,
    vehicleId: (raw.vehicleId as string) || "FW-18",
    priority: priorityNum,
    commodity: raw.loadType || raw.commodity || "Critical Medical Supplies",
    progressPercent: normalizedStatus === "delivered" ? 100 : 18,
    etaIso: raw.createdAt
      ? new Date(new Date(raw.createdAt).getTime() + 4 * 3600 * 1000).toISOString()
      : new Date().toISOString(),
    status: normalizedStatus,
    currentRouteId: `ROUTE-${rawId}`,
    riskScore: priorityNum === 1 ? 0.08 : 0.16,
    driverId: (raw.driverId as string) || "DRV-002",
    driverName: "T. Sangma",
    driverPhone: "+91 94361 78921",
    driverPhotoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    vehicleNumber: "ML-05-D-2218",
    vehicleType: "Medical Utility 4x4",
    weightKg: typeof raw.weightKg === "number" ? raw.weightKg : 1200
  };
}

/**
 * Shipments Service
 */
export const shipmentApi = {
  /**
   * Fetches shipments from live backend GET /shipments/list (with adaptive fallbacks)
   */
  async getAll(config?: AxiosRequestConfig): Promise<Shipment[]> {
    let rawList: BackendShipmentItem[] = [];

    try {
      const res = await apiClient.get<
        { shipments?: BackendShipmentItem[]; data?: BackendShipmentItem[] } | BackendShipmentItem[]
      >("/shipments/list", config);

      if (Array.isArray(res.data)) {
        rawList = res.data;
      } else if (res.data?.shipments && Array.isArray(res.data.shipments)) {
        rawList = res.data.shipments;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        rawList = res.data.data;
      }
    } catch {
      try {
        const fallback = await getAdaptive<
          BackendShipmentItem[] | { shipments?: BackendShipmentItem[]; data?: BackendShipmentItem[] }
        >("/shipments", "/api/shipments/list", config);

        if (Array.isArray(fallback)) {
          rawList = fallback;
        } else if (fallback && typeof fallback === "object") {
          rawList = fallback.shipments || fallback.data || [];
        }
      } catch (err) {
        console.warn("[ShipmentAPI] Could not fetch live shipments list from backend:", err);
      }
    }

    if (rawList.length > 0) {
      return rawList.map((item, idx) => transformBackendShipment(item, idx));
    }

    return [];
  },

  /**
   * Creates a new shipment via POST /shipments/create (with fallback to /shipments/creat)
   * Sends all required fields expected by req.body:
   * loadType, vehicleId, driverId, routeId, weightKg, priority, route, image, origin, destination
   */
  async create(input: CreateShipmentInput, config?: AxiosRequestConfig): Promise<Shipment> {
    const originGeoJson: GeoJsonPoint = {
      type: "Point",
      coordinates: [Number(input.origin.coordinates[0]), Number(input.origin.coordinates[1])]
    };
    const destinationGeoJson: GeoJsonPoint = {
      type: "Point",
      coordinates: [Number(input.destination.coordinates[0]), Number(input.destination.coordinates[1])]
    };

    // 1. Fetch ORS calculated route from backend alternatives endpoint if not already computed
    let routeSummary = input.route;
    if (!routeSummary) {
      try {
        const altRes = await routeAlternativesApi.fetchParsedAlternatives({
          origin: originGeoJson,
          destination: destinationGeoJson
        });
        if (altRes && altRes.length > 0) {
          routeSummary = {
            distanceKm: altRes[0].distanceKm,
            durationMinutes: altRes[0].durationMinutes
          };
        }
      } catch (err) {
        console.warn("[ShipmentAPI] Pre-fetching ORS route alternatives failed, using distance estimation:", err);
        const distApprox = Math.round(
          Math.hypot(
            destinationGeoJson.coordinates[0] - originGeoJson.coordinates[0],
            destinationGeoJson.coordinates[1] - originGeoJson.coordinates[1]
          ) * 111 * 1.3
        );
        routeSummary = {
          distanceKm: distApprox,
          durationMinutes: Math.round((distApprox / 45) * 60)
        };
      }
    }

    const priorityLabel =
      input.priority === 1 || input.priority === "HIGH"
        ? "HIGH"
        : input.priority === 2 || input.priority === "MEDIUM"
        ? "MEDIUM"
        : "LOW";

    const routeId = input.routeId || `ROUTE-${Date.now()}`;

    // 2. Prepare FormData payload with image file / blob (required <= 45 KB)
    const formData = new FormData();

    const photoBlob = input.driverPhoto || input.image;
    if (photoBlob && photoBlob instanceof Blob) {
      const fileName = (photoBlob as File).name || "driver_photo.jpg";
      formData.append("image", photoBlob, fileName);
    } else {
      // 1x1 transparent pixel fallback if no image attached
      const transparentPixel =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=";
      try {
        const pixelBlob = await fetch(transparentPixel).then((r) => r.blob());
        formData.append("image", pixelBlob, "consignment.png");
      } catch {
        // Fallback
      }
    }

    // Required fields per backend specifications
    formData.append("loadType", input.loadType || input.commodity || "Critical Medical Supplies");
      if (input.trackingNumber) {
        formData.append("trackingNumber", input.trackingNumber);
      }
      if (input.status) {
        formData.append("status", input.status);
      }
      if (input.expectedDeliveryIso) {
        formData.append("expectedDelivery", input.expectedDeliveryIso);
      }
    formData.append("weightKg", String(input.weightKg || 1200));
    formData.append("priority", priorityLabel);
    formData.append("routeId", routeId);
    formData.append("origin", JSON.stringify(originGeoJson));
    formData.append("destination", JSON.stringify(destinationGeoJson));

    if (routeSummary) {
      formData.append("route", JSON.stringify(routeSummary));
    }
    if (input.vehicleId) {
      formData.append("vehicleId", input.vehicleId);
    }
    if (input.driverId) {
      formData.append("driverId", input.driverId);
    }
    if (input.driverName) {
      formData.append("driverName", input.driverName);
    }
    if (input.driverPhone) {
      formData.append("driverPhone", input.driverPhone);
    }
    if (input.driverLicenseId) {
      formData.append("driverLicenseId", input.driverLicenseId);
    }
    formData.append("vehicleUnit", input.vehicleUnit || "moderate");
    formData.append("fleetClassification", input.fleetClassification || "transit");

    // 3. Dispatch to POST /shipments/create (with adaptive fallback to /shipments/creat and /api/shipments/create)
    let createdRaw: unknown = null;
    const postEndpoints = ["/shipments/create", "/shipments/creat", "/api/shipments/create"];
    let lastError: unknown = null;

    for (const ep of postEndpoints) {
      try {
        const res = await apiClient.post(ep, formData, {
          ...config,
          headers: {
            ...config?.headers,
            "Content-Type": "multipart/form-data"
          }
        });
        createdRaw = res.data;
        break;
      } catch (err: unknown) {
        lastError = err;
        const responseData = axios.isAxiosError(err) ? err.response?.data : undefined;
        const isRouteNotFound =
          axios.isAxiosError(err) &&
          err.response?.status === 404 &&
          (!responseData || typeof responseData !== "object" || !("message" in responseData));
        if (isRouteNotFound) {
          continue; // Try next endpoint spelling if 404
        }
        // If server rejected with 400 or other validation status, rethrow immediately
        throw err;
      }
    }

    if (!createdRaw && lastError) {
      throw lastError;
    }

    // 4. Return transformed shipment from backend response
    const rawObj = (createdRaw && typeof createdRaw === "object" && "shipment" in createdRaw
      ? (createdRaw as { shipment: BackendShipmentItem }).shipment
      : createdRaw && typeof createdRaw === "object" && "data" in createdRaw
      ? (createdRaw as { data: BackendShipmentItem }).data
      : createdRaw) as BackendShipmentItem;

    if (rawObj && typeof rawObj === "object") {
      const transformed = transformBackendShipment(rawObj);
      if (input.driverName) transformed.driverName = input.driverName;
      if (input.driverPhone) transformed.driverPhone = input.driverPhone;
      if (input.vehicleNumber) transformed.vehicleNumber = input.vehicleNumber;
      if (input.vehicleType) transformed.vehicleType = input.vehicleType;
      if (input.specialInstructions) transformed.specialInstructions = input.specialInstructions;
      return transformed;
    }

    // Resilient fallback shipment with reverse geocoding
    const originName = reverseGeocodeCoordinates(originGeoJson.coordinates[0], originGeoJson.coordinates[1]);
    const destName = reverseGeocodeCoordinates(destinationGeoJson.coordinates[0], destinationGeoJson.coordinates[1]);
    return {
      id: `SHP-LIVE-${Date.now().toString().slice(-4)}`,
      origin: originName,
      destination: destName,
      originCoordinates: originGeoJson.coordinates,
      destinationCoordinates: destinationGeoJson.coordinates,
      vehicleId: input.vehicleId || "FW-18",
      priority: (input.priority as 1 | 2 | 3) || 1,
      commodity: input.commodity || "Critical Medical Supplies",
      progressPercent: 0,
      etaIso: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      status: "on_time",
      currentRouteId: `ROUTE-${Date.now()}`,
      riskScore: 0.08,
      driverId: input.driverId || "DRV-002",
      driverName: input.driverName || "T. Sangma",
      driverPhone: input.driverPhone || "+91 94361 78921",
      driverPhotoUrl:
        input.driverPhotoUrl ||
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
      vehicleNumber: input.vehicleNumber || "ML-05-D-2218",
      vehicleType: input.vehicleType || "Medical Utility 4x4",
      specialInstructions: input.specialInstructions
    };
  },

  async reroute(shipmentId: string, routeId: string, config?: AxiosRequestConfig): Promise<Shipment> {
    const d = await postAdaptive<Shipment | { data: Shipment } | { shipment: Shipment }>(
      `/shipments/${shipmentId}/reroute`,
      `/api/shipments/${shipmentId}/reroute`,
      { routeId },
      config
    );
    if (d && typeof d === "object") {
      if ("data" in d) return (d as { data: Shipment }).data;
      if ("shipment" in d) return (d as { shipment: Shipment }).shipment;
    }
    return d as Shipment;
  }
};
