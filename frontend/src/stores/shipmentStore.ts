import { create } from "zustand";
import type { Shipment, RouteOption } from "@/types/domain";

interface ShipmentState {
  shipments: Shipment[];
  routes: RouteOption[];
  selectedShipmentId: string | null;
  setShipments: (shipments: Shipment[], routes?: RouteOption[]) => void;
  addShipment: (shipment: Shipment, route?: RouteOption) => void;
  applyPatch: (shipments?: Shipment[], routes?: RouteOption[]) => void;
  selectShipment: (id: string | null) => void;
}

export const useShipmentStore = create<ShipmentState>((set) => ({
  shipments: [],
  routes: [],
  selectedShipmentId: "SHP-001",
  setShipments: (shipments, routes) =>
    set({
      shipments,
      ...(routes ? { routes } : {})
    }),
  addShipment: (shipment, route) =>
    set((state) => ({
      shipments: [shipment, ...state.shipments],
      routes: route ? [route, ...state.routes] : state.routes,
      selectedShipmentId: shipment.id
    })),
  applyPatch: (patchedShipments, patchedRoutes) =>
    set((state) => {
      let nextShipments = state.shipments;
      if (patchedShipments) {
        const map = new Map(state.shipments.map((s) => [s.id, s]));
        patchedShipments.forEach((ps) => {
          const ex = map.get(ps.id);
          map.set(ps.id, ex ? { ...ex, ...ps } : ps);
        });
        nextShipments = Array.from(map.values());
      }
      return {
        shipments: nextShipments,
        ...(patchedRoutes ? { routes: patchedRoutes } : {})
      };
    }),
  selectShipment: (id) => set({ selectedShipmentId: id })
}));
