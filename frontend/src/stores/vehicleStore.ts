import { create } from "zustand";
import type { Vehicle } from "@/types/domain";

interface VehicleState {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  setVehicles: (vehicles: Vehicle[]) => void;
  applyPatch: (vehicles: Vehicle[]) => void;
  selectVehicle: (id: string | null) => void;
}

export const useVehicleStore = create<VehicleState>((set) => ({
  vehicles: [],
  selectedVehicleId: "HV-09",
  setVehicles: (vehicles) => set({ vehicles }),
  applyPatch: (patchedVehicles) =>
    set((state) => {
      const map = new Map(state.vehicles.map((v) => [v.id, v]));
      patchedVehicles.forEach((pv) => {
        const existing = map.get(pv.id);
        map.set(pv.id, existing ? { ...existing, ...pv } : pv);
      });
      return { vehicles: Array.from(map.values()) };
    }),
  selectVehicle: (id) => set({ selectedVehicleId: id })
}));
