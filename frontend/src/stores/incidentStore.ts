import { create } from "zustand";
import type { Incident } from "@/types/domain";

interface IncidentState {
  incidents: Incident[];
  selectedIncidentId: string | null;
  setIncidents: (incidents: Incident[]) => void;
  applyPatch: (patchedIncidents: Incident[]) => void;
  addIncident: (incident: Incident) => void;
  selectIncident: (id: string | null) => void;
}

export const useIncidentStore = create<IncidentState>((set) => ({
  incidents: [],
  selectedIncidentId: "INC-4092",
  setIncidents: (incidents) => set({ incidents }),
  applyPatch: (patchedIncidents) =>
    set((state) => {
      const map = new Map(state.incidents.map((i) => [i.id, i]));
      patchedIncidents.forEach((pi) => {
        map.set(pi.id, pi);
      });
      return { incidents: Array.from(map.values()) };
    }),
  addIncident: (incident) =>
    set((state) => ({ incidents: [incident, ...state.incidents] })),
  selectIncident: (id) => set({ selectedIncidentId: id })
}));
