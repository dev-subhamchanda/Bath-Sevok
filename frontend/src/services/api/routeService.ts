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
  [key: string]: unknown;
}

export interface RouteAlternativesApiResponse {
  routes?: ApiRawRouteItem[];
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

  if (Array.isArray(rawResponse)) {
    list = rawResponse;
  } else if (rawResponse && typeof rawResponse === "object") {
    if (Array.isArray(rawResponse.routes)) {
      list = rawResponse.routes;
    } else if (rawResponse.data && Array.isArray(rawResponse.data.routes)) {
      list = rawResponse.data.routes;
    }
  }

  if (!list || list.length === 0) {
    return [];
  }

  return list.map((item, index) => {
    const leafletCoords = extractLeafletCoordinates(item);
    const rawGeoCoords = (item.coordinates || item.geometry?.coordinates || []) as [number, number][];
    const dist = typeof item.distanceKm === "number" ? Math.round(item.distanceKm * 10) / 10 : 0;
    const dur = typeof item.durationMinutes === "number" ? Math.round(item.durationMinutes) : 0;
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
      via: (item.via as string) || (index === 0 ? "Guwahati ➔ Tezpur ➔ Itanagar" : `Bypass Corridor ${letter}`)
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
