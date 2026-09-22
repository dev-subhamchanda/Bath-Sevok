import type { AxiosRequestConfig } from "axios";
import type { RouteOption } from "@/types/domain";
import { getAdaptive, postAdaptive } from "./httpClient";

export interface GeoJsonPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface RouteAlternativesRequestBody {
  origin: GeoJsonPoint;
  destination: GeoJsonPoint;
  vehicle_profile?: string;
}

export const DEFAULT_ROUTE_COORDINATES: RouteAlternativesRequestBody = {
  origin: {
    type: "Point",
    coordinates: [91.7362, 26.1445] // Guwahati (lng, lat)
  },
  destination: {
    type: "Point",
    coordinates: [93.6167, 27.0844] // Itanagar (lng, lat)
  }
};

export interface ApiRawRouteItem {
  id?: string;
  distanceKm?: number;
  durationMinutes?: number;
  coordinates?: [number, number][]; // [longitude, latitude]
  geometry?: {
    type?: string;
    coordinates?: [number, number][]; // [longitude, latitude]
  };
  name?: string;
  summary?: string;
  via?: string;
  total_distance_km?: number;
  duration_min?: number;
  verdict?: string;
  action?: string;
  primary_hazard?: string;
  closure_likelihood?: number;
  warnings?: unknown[];
  dispatch_window?: { message?: string; projected_verdict?: string };
  [key: string]: unknown;
}

export interface RouteAlternativesApiResponse {
  routes?: ApiRawRouteItem[];
  recommendation?: string;
  ranking?: string[];
  vehicle_profile?: string;
  start?: [number, number];
  end?: [number, number];
  data?: {
    routes?: ApiRawRouteItem[];
  };
  [key: string]: unknown;
}

export interface ParsedAlternativeRoute {
  id: string;
  name: string;
  isAlternative: boolean;
  distanceKm: number;
  durationMinutes: number;
  etaFormatted: string;
  coordinates: [number, number][]; // [latitude, longitude] for Leaflet
  rawGeoJsonCoordinates: [number, number][]; // [longitude, latitude]
  summary: string;
  via: string;
  isFlooded?: boolean;
  vehicleProfile?: string;
  verdict?: string;
  action?: string;
  primaryHazard?: string;
  closureLikelihood?: number;
  warnings?: unknown[];
  dispatchMessage?: string;
}

/**
 * Formats duration in minutes into clean "Xh Ym" string
 */
export function formatMinutesToEta(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Robust extractor for coordinates from API responses.
 * Adapts to:
 * - route.coordinates ([ [lng, lat], ... ])
 * - route.geometry.coordinates ([ [lng, lat], ... ])
 * Converts GeoJSON [longitude, latitude] to Leaflet [latitude, longitude].
 */
export function extractLeafletCoordinates(route: ApiRawRouteItem): [number, number][] {
  let rawList: [number, number][] | undefined = undefined;

  if (Array.isArray(route.coordinates) && route.coordinates.length > 0) {
    rawList = route.coordinates;
  } else if (
    route.geometry &&
    Array.isArray(route.geometry.coordinates) &&
    route.geometry.coordinates.length > 0
  ) {
    rawList = route.geometry.coordinates;
  }

  if (!rawList || rawList.length === 0) {
    return [];
  }

  // Convert GeoJSON [longitude, latitude] to Leaflet [latitude, longitude]
  return rawList
    .map((pt) => {
      if (Array.isArray(pt) && pt.length >= 2) {
        const lng = Number(pt[0]);
        const lat = Number(pt[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return [lat, lng] as [number, number];
        }
      }
      return null;
    })
    .filter((pt): pt is [number, number] => pt !== null);
}

/**
 * Parses raw API response into a standardized list of ParsedAlternativeRoute objects
 */
export function parseRouteAlternativesResponse(
  rawResponse: RouteAlternativesApiResponse | ApiRawRouteItem[]
): ParsedAlternativeRoute[] {
  let list: ApiRawRouteItem[] = [];
  let responseMeta: RouteAlternativesApiResponse | undefined;

  if (Array.isArray(rawResponse)) {
    list = rawResponse;
  } else if (rawResponse && typeof rawResponse === "object") {
    responseMeta = rawResponse;
    if (Array.isArray(rawResponse.routes)) {
      list = rawResponse.routes;
    } else if (rawResponse.data && Array.isArray(rawResponse.data.routes)) {
      list = rawResponse.data.routes;
    } else {
      // The AI dispatch adapter may be wrapped by the Node backend as
      // { routes: { recommendation, ranking, routes: [...] } }.
      const wrappedRoutes = rawResponse.routes as unknown;
      if (wrappedRoutes && typeof wrappedRoutes === "object") {
        const dispatchResponse = wrappedRoutes as RouteAlternativesApiResponse;
        responseMeta = dispatchResponse;
        if (Array.isArray(dispatchResponse.routes)) {
          list = dispatchResponse.routes;
        }
      }
    }
  }

  if (!list || list.length === 0) {
    return [];
  }

  return list.map((item, index) => {
    const leafletCoords = extractLeafletCoordinates(item);
    const rawGeoCoords = (item.coordinates || item.geometry?.coordinates || []) as [number, number][];
    const rawDistance = item.distanceKm ?? item.total_distance_km;
    const rawDuration = item.durationMinutes ?? item.duration_min;
    const dist = typeof rawDistance === "number" ? Math.round(rawDistance * 10) / 10 : 0;
    const dur = typeof rawDuration === "number" ? Math.round(rawDuration) : 0;
    const letter = String.fromCharCode(65 + index); // A, B, C...

    return {
      id: (item.id as string) || `route-${letter.toLowerCase()}-${index}`,
      name: (item.name as string) || `Route ${letter} ${index === 0 ? "(Primary Arterial)" : `(Alternative ${index})`}`,
      isAlternative: index > 0,
      distanceKm: dist,
      durationMinutes: dur,
      etaFormatted: formatMinutesToEta(dur),
      coordinates: leafletCoords,
      rawGeoJsonCoordinates: rawGeoCoords,
      summary: (item.summary as string) || `${dist} km corridor connecting origin and destination`,
      via: (item.via as string) || (item.primary_hazard as string) || (index === 0 ? "Primary corridor" : `Alternative Corridor ${letter}`),
      vehicleProfile: responseMeta?.vehicle_profile,
      verdict: item.verdict,
      action: item.action,
      primaryHazard: item.primary_hazard,
      closureLikelihood: item.closure_likelihood,
      warnings: item.warnings,
      dispatchMessage: item.dispatch_window?.message
    };
  });
}

/**
 * Route Alternatives API (POST /routes/alternatives)
 */
export const routeAlternativesApi = {
  /**
   * Raw POST request via Axios
   */
  async getAlternatives(
    body: RouteAlternativesRequestBody = DEFAULT_ROUTE_COORDINATES,
    config?: AxiosRequestConfig
  ): Promise<RouteAlternativesApiResponse> {
    return postAdaptive<RouteAlternativesApiResponse>(
      "/routes/alternatives",
      "/api/v1/routes/alternatives",
      body,
      config
    );
  },

  /**
   * Fetches alternatives and parses coordinates into Leaflet format
   */
  async fetchParsedAlternatives(
    body: RouteAlternativesRequestBody = DEFAULT_ROUTE_COORDINATES,
    config?: AxiosRequestConfig
  ): Promise<ParsedAlternativeRoute[]> {
    const rawData = await this.getAlternatives(body, config);
    return parseRouteAlternativesResponse(rawData);
  }
};

/**
 * Alternate Routes API
 */
export const routeApi = {
  async getAll(config?: AxiosRequestConfig): Promise<RouteOption[]> {
    const d = await getAdaptive<RouteOption[] | { data: RouteOption[] }>("/routes", "/api/routes", config);
    return (Array.isArray(d) ? d : (d as { data: RouteOption[] })?.data || []) as RouteOption[];
  },
  // Export routeAlternativesApi inside routeApi as well for backwards-compatibility
  alternatives: routeAlternativesApi
};
