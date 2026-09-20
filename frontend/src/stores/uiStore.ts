import { create } from "zustand";
import type { UserRole, KpiSummary } from "@/types/domain";
import { initialKpis } from "@/services/mock/seedData";

interface UserGpsLocation {
  lat: number;
  lng: number;
  accuracy: number;
  isLive: boolean;
  readableLocation?: string;
}

interface UiState {
  activeRole: UserRole;
  selectedVehicleType: "heavy" | "four-wheeler" | "two-wheeler";
  searchQuery: string;
  mapLayerMode: "terrain" | "corridors" | "satellite";
  mapFilterChip: "all" | "blocked" | "at_risk" | "active_fleet";
  isReportModalOpen: boolean;
  isAlertPanelCollapsed: boolean;
  isSidebarCollapsed: boolean;
  isMapPanelCollapsed: boolean;
  demoScenarioStatus: "idle" | "running" | "flooded" | "rerouted";
  kpis: KpiSummary;
  userGpsLocation: UserGpsLocation | null;
  setActiveRole: (role: UserRole) => void;
  setSelectedVehicleType: (vType: "heavy" | "four-wheeler" | "two-wheeler") => void;
  setSearchQuery: (query: string) => void;
  setMapLayerMode: (mode: "terrain" | "corridors" | "satellite") => void;
  setMapFilterChip: (chip: "all" | "blocked" | "at_risk" | "active_fleet") => void;
  setIsReportModalOpen: (open: boolean) => void;
  setIsAlertPanelCollapsed: (collapsed: boolean) => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setIsMapPanelCollapsed: (collapsed: boolean) => void;
  toggleMapPanel: () => void;
  setDemoScenarioStatus: (status: "idle" | "running" | "flooded" | "rerouted") => void;
  setKpis: (kpis: KpiSummary) => void;
  setUserGpsLocation: (loc: UserGpsLocation | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeRole: "operator",
  selectedVehicleType: "four-wheeler",
  searchQuery: "",
  mapLayerMode: "terrain",
  mapFilterChip: "all",
  isReportModalOpen: false,
  isAlertPanelCollapsed: true,
  isSidebarCollapsed: false,
  isMapPanelCollapsed: false,
  demoScenarioStatus: "idle",
  kpis: initialKpis,
  userGpsLocation: {
    lat: 25.7200,
    lng: 91.8700,
    accuracy: 12,
    isLive: false,
    readableLocation: "NH-6 Corridor near Nongpoh, Meghalaya"
  },
  setActiveRole: (role) => set({ activeRole: role }),
  setSelectedVehicleType: (selectedVehicleType) => set({ selectedVehicleType }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setMapLayerMode: (mapLayerMode) => set({ mapLayerMode }),
  setMapFilterChip: (mapFilterChip) => set({ mapFilterChip }),
  setIsReportModalOpen: (isReportModalOpen) => set({ isReportModalOpen }),
  setIsAlertPanelCollapsed: (isAlertPanelCollapsed) => set({ isAlertPanelCollapsed }),
  setIsSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setIsMapPanelCollapsed: (isMapPanelCollapsed) => set({ isMapPanelCollapsed }),
  toggleMapPanel: () => set((state) => ({ isMapPanelCollapsed: !state.isMapPanelCollapsed })),
  setDemoScenarioStatus: (demoScenarioStatus) => set({ demoScenarioStatus }),
  setKpis: (kpis) => set({ kpis }),
  setUserGpsLocation: (userGpsLocation) => set({ userGpsLocation })
}));

