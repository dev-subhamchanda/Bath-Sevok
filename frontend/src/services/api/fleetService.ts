import type { AxiosRequestConfig } from "axios";
import type { Vehicle, RoadSegment } from "@/types/domain";
import { apiClient, getAdaptive } from "./httpClient";

export interface ShipmentVehicleOption {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  capacityKg: number;
  driverId?: string;
}

/**
 * Vehicles Service
 */
export const vehicleApi = {
  async getShipmentOptions(config?: AxiosRequestConfig): Promise<ShipmentVehicleOption[]> {
    const res = await apiClient.get<{ vehicles?: Array<Record<string, unknown>> }>("/vehicles/list", config);
    return (res.data.vehicles || []).map((vehicle) => ({
      id: String(vehicle._id || ""),
      vehicleNumber: String(vehicle.vehicleNumber || "Unknown vehicle"),
      vehicleType: String(vehicle.type || "Fleet vehicle"),
      capacityKg: typeof vehicle.capacityKg === "number" ? vehicle.capacityKg : 0,
      driverId: vehicle.driverId ? String(vehicle.driverId) : undefined
    })).filter((vehicle) => vehicle.id);
  },

  async getAll(config?: AxiosRequestConfig): Promise<Vehicle[]> {
    try {
      const res = await apiClient.get<{ vehicles?: unknown[]; data?: unknown[] } | unknown[]>("/vehicles/list", config);
      const list = Array.isArray(res.data) ? res.data : (res.data as { vehicles?: unknown[] })?.vehicles || [];
      if (list && list.length > 0) {
        return list.map((rawItem: unknown, index: number) => {
          const v = (rawItem || {}) as Record<string, unknown>;
          const location = v.currentLocation as { coordinates?: [number, number] } | undefined;
          const coords = location?.coordinates || [91.7362, 26.1445];
          const capacity = typeof v.capacityKg === "number" ? v.capacityKg : 0;
          return {
            id: (v.registrationNumber as string) || (v._id as string) || `VEH-${index + 1}`,
            name: `${(v.model as string) || "Freight Unit"} (${(v.registrationNumber as string) || "NER-TRUCK"})`,
            cargoType: "medical",
            vehicleType: capacity > 10000 ? "heavy" : "four-wheeler",
            lat: coords[1],
            lng: coords[0],
            speedKph: v.status === "AVAILABLE" ? 0 : 54,
            headingDeg: 60,
            status: v.status === "AVAILABLE" ? "idle" : "moving",
            lastUpdated: (v.updatedAt as string) || new Date().toISOString()
          } as Vehicle;
        });
      }
    } catch {
      // Fall back to adaptive get
    }

    const d = await getAdaptive<Vehicle[] | { data: Vehicle[] }>("/vehicles", "/api/vehicles", config).catch(() => []);
    return (Array.isArray(d) ? d : (d as { data: Vehicle[] })?.data || []) as Vehicle[];
  },

  /**
   * Get current live vehicle location via GET /api/v1/vehicles/:vehicleId/location
   */
  async getLocation(
    vehicleId: string,
    config?: AxiosRequestConfig
  ): Promise<{ location?: { vehicleId: string; latitude: number; longitude: number; speedKmh: number; heading: number; updatedAt: string } } | null> {
    try {
      return await getAdaptive<{ location?: { vehicleId: string; latitude: number; longitude: number; speedKmh: number; heading: number; updatedAt: string } }>(
        `/api/v1/vehicles/${vehicleId}/location`,
        `/vehicles/${vehicleId}/location`,
        config
      );
    } catch {
      return null;
    }
  }
};

/**
 * Drivers Service
 */
export const driverApi = {
  async getAll(config?: AxiosRequestConfig): Promise<unknown[]> {
    try {
      const res = await apiClient.get<{ drivers?: unknown[]; data?: unknown[] } | unknown[]>("/driver/list", config);
      return Array.isArray(res.data) ? res.data : (res.data as { drivers?: unknown[] })?.drivers || [];
    } catch {
      return [];
    }
  }
};

/**
 * Roads Service
 */
export const roadApi = {
  async getAll(config?: AxiosRequestConfig): Promise<RoadSegment[]> {
    const d = await getAdaptive<RoadSegment[] | { data: RoadSegment[] }>("/roads", "/api/roads", config);
    return (Array.isArray(d) ? d : (d as { data: RoadSegment[] })?.data || []) as RoadSegment[];
  }
};
