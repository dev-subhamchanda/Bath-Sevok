import axios, { type AxiosRequestConfig } from "axios";
import type { Shipment } from "@/types/domain";
import { apiClient, postAdaptive } from "./httpClient";
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
  priority?: 1 | 2 | 3 | "HIGH" | "MEDIUM" | "LOW" | "URGENT" | "NORMAL";
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
  const rawId = (raw._id || raw.id || raw.trackingNumber || `SHP-LIVE-${index + 1}`).toString();
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

  const priorityRaw = typeof raw.priority === "string" ? raw.priority.toUpperCase() : raw.priority;
  const priorityNum: 1 | 2 | 3 =
    priorityRaw === "URGENT" || priorityRaw === "HIGH" || priorityRaw === 1
      ? 1
      : priorityRaw === "NORMAL" || priorityRaw === "MEDIUM" || priorityRaw === 2
      ? 2
      : 3;

  const statusMap: Record<string, "on_time" | "at_risk" | "delayed" | "delivered"> = {
    PENDING: "on_time",
    ASSIGNED: "on_time",
    IN_TRANSIT: "on_time",
    ON_TIME: "on_time",
    AT_RISK: "at_risk",
    DELAYED: "delayed",
    DELIVERED: "delivered",
    CANCELLED: "delayed"
  };
  const normalizedStatus = (raw.status ? statusMap[raw.status.toString().toUpperCase()] : "on_time") || "on_time";

  // Handle populated or raw vehicleId
  let vehicleIdStr = "FW-18";
  let vehicleNumber = "ML-05-D-2218";
  let vehicleType = "Medical Utility 4x4";
  if (raw.vehicleId) {
    if (typeof raw.vehicleId === "object") {
      const vObj = raw.vehicleId as Record<string, unknown>;
      vehicleIdStr = (vObj._id || vObj.id || "FW-18").toString();
      vehicleNumber = (vObj.vehicleNumber as string) || vehicleNumber;
      vehicleType = (vObj.type as string) || vehicleType;
    } else {
      vehicleIdStr = raw.vehicleId.toString();
    }
  }

  // Handle populated or raw driverId
  let driverIdStr = "DRV-002";
  let driverPhone = "+91 94361 78921";
  if (raw.driverId) {
    if (typeof raw.driverId === "object") {
      const dObj = raw.driverId as Record<string, unknown>;
      driverIdStr = (dObj._id || dObj.id || "DRV-002").toString();
      driverPhone = (dObj.phone as string) || driverPhone;
    } else {
      driverIdStr = raw.driverId.toString();
    }
  }

  const rawCreatedAt = (raw.createdAt as string) || undefined;
  const rawExpectedDelivery = (raw.expectedDelivery as string) || undefined;

  return {
    id: rawId,
    rawBackendId: raw._id?.toString(),
    trackingNumber,
    origin: originName,
    destination: destName,
    originCoordinates: originCoords,
    destinationCoordinates: destCoords,
    vehicleId: vehicleIdStr,
    priority: priorityNum,
    commodity: raw.loadType || raw.commodity || "Critical Medical Supplies",
    progressPercent: normalizedStatus === "delivered" ? 100 : normalizedStatus === "at_risk" ? 35 : 18,
    etaIso: rawExpectedDelivery
      ? new Date(rawExpectedDelivery).toISOString()
      : rawCreatedAt
      ? new Date(new Date(rawCreatedAt).getTime() + 4 * 3600 * 1000).toISOString()
      : new Date().toISOString(),
    status: normalizedStatus,
    currentRouteId: `ROUTE-${rawId}`,
    riskScore: priorityNum === 1 ? 0.08 : 0.16,
    driverId: driverIdStr,
    driverName: (raw.driverName as string) || "T. Sangma",
    driverPhone: (raw.driverPhone as string) || driverPhone,
    driverPhotoUrl:
      (raw.imageUrl as string) ||
      (raw.driverPhotoUrl as string) ||
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    vehicleNumber,
    vehicleType,
    weightKg: typeof raw.weightKg === "number" ? raw.weightKg : 1200
  };
}

/**
 * Shipments Service
 */
export const shipmentApi = {
  /**
   * Fetches shipments from live backend GET /api/v1/shipments/list (with /shipments/list fallback)
   */
  async getAll(config?: AxiosRequestConfig): Promise<Shipment[]> {
    let rawList: BackendShipmentItem[] = [];

    const endpoints = ["/api/v1/shipments/list", "/shipments/list"];
    for (const ep of endpoints) {
      try {
        const res = await apiClient.get<
          { shipments?: BackendShipmentItem[]; data?: BackendShipmentItem[] } | BackendShipmentItem[]
        >(ep, config);

        if (Array.isArray(res.data)) {
          rawList = res.data;
          break;
        } else if (res.data?.shipments && Array.isArray(res.data.shipments)) {
          rawList = res.data.shipments;
          break;
        } else if (res.data?.data && Array.isArray(res.data.data)) {
          rawList = res.data.data;
          break;
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          // Unauthorized: user is not signed in
          return [];
        }
      }
    }

    if (rawList.length > 0) {
      return rawList.map((item, idx) => transformBackendShipment(item, idx));
    }

    return [];
  },

  /**
   * Creates a new shipment via POST /api/v1/shipments/create
   * Sends all required fields expected by backend:
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
            durationMinutes: altRes[0].durationMinutes,
            geometry: {
              type: "LineString",
              coordinates: altRes[0].rawGeoJsonCoordinates || []
            }
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

    let priorityLabel: "LOW" | "NORMAL" | "HIGH" | "URGENT" = "NORMAL";
    const pStr = String(input.priority || "NORMAL").toUpperCase();
    if (pStr === "1" || pStr === "HIGH" || pStr === "URGENT") {
      priorityLabel = "HIGH";
    } else if (pStr === "2" || pStr === "MEDIUM" || pStr === "NORMAL") {
      priorityLabel = "NORMAL";
    } else if (pStr === "3" || pStr === "LOW") {
      priorityLabel = "LOW";
    }

    const routeId = input.routeId || `ROUTE-${Date.now()}`;

    // 2. Prepare FormData payload with image file / blob (required <= 50 KB)
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
    if (input.routeId) {
      formData.append("routeId", routeId);
    }
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

    // 3. Dispatch to POST /api/v1/shipments/create (with fallback to /shipments/create)
    let createdRaw: unknown = null;
    const postEndpoints = ["/api/v1/shipments/create", "/shipments/create"];
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

  /**
   * Track shipment and fetch current GPS location via POST /api/v1/shipments/tracking
   */
  async track(trackingNumber: string, vehicleId: string, config?: AxiosRequestConfig): Promise<{ shipment: BackendShipmentItem; currentLocation: unknown }> {
    return postAdaptive<{ shipment: BackendShipmentItem; currentLocation: unknown }>(
      "/api/v1/shipments/tracking",
      "/shipments/tracking",
      { trackingNumber, vehicleId },
      config
    );
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
