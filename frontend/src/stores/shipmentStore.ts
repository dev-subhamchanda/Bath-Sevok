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
  // Demo map data disabled for production.
  // Kept for development/testing.
  // selectedShipmentId: "SHP-001",
  selectedShipmentId: null,
  setShipments: (newShipments, newRoutes) =>
    set((state) => {
      const existingMap = new Map(state.shipments.map((s) => [s.id, s]));
      const mergedShipments = newShipments.map((s) => {
        const existing = existingMap.get(s.id);
        if (existing) {
          return {
            ...s,
            routeGeometry:
              s.routeGeometry && s.routeGeometry.length > 0
                ? s.routeGeometry
                : existing.routeGeometry,
            routeDistanceKm: s.routeDistanceKm ?? existing.routeDistanceKm,
            routeDurationMinutes: s.routeDurationMinutes ?? existing.routeDurationMinutes
          };
        }
        return s;
      });
      return {
        shipments: mergedShipments,
        routes: newRoutes ?? state.routes
      };
    }),
  addShipment: (shipment, route) =>
    set((state) => ({
      shipments: [shipment, ...state.shipments.filter((s) => s.id !== shipment.id)],
      routes: route ? [route, ...state.routes.filter((r) => r.id !== route.id)] : state.routes,
      selectedShipmentId: shipment.id
    })),
  applyPatch: (patchedShipments, patchedRoutes) =>
    set((state) => {
      let nextShipments = state.shipments;
      if (patchedShipments) {
        const map = new Map(state.shipments.map((s) => [s.id, s]));
        patchedShipments.forEach((ps) => {
          const ex = map.get(ps.id);
          const mergedGeometry =
            ps.routeGeometry && ps.routeGeometry.length > 0
              ? ps.routeGeometry
              : ex?.routeGeometry;
          map.set(ps.id, ex ? { ...ex, ...ps, routeGeometry: mergedGeometry } : ps);
        });
        nextShipments = Array.from(map.values());
      }
      return {
        shipments: nextShipments,
        routes: patchedRoutes ?? state.routes
      };
    }),
  selectShipment: (id) => set({ selectedShipmentId: id })
}));
