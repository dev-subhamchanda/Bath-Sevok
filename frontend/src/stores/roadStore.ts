import { create } from "zustand";
import type { RoadSegment } from "@/types/domain";

interface RoadState {
  roads: RoadSegment[];
  selectedRoadId: string | null;
  setRoads: (roads: RoadSegment[]) => void;
  applyPatch: (patchedRoads: RoadSegment[]) => void;
  selectRoad: (id: string | null) => void;
}

export const useRoadStore = create<RoadState>((set) => ({
  roads: [],
  selectedRoadId: "NH-6",
  setRoads: (roads) => set({ roads }),
  applyPatch: (patchedRoads) =>
    set((state) => {
      const map = new Map(state.roads.map((r) => [r.id, r]));
      patchedRoads.forEach((pr) => {
        const existing = map.get(pr.id);
        map.set(pr.id, existing ? { ...existing, ...pr } : pr);
      });
      return { roads: Array.from(map.values()) };
    }),
  selectRoad: (id) => set({ selectedRoadId: id })
}));
