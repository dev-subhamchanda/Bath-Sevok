import { create } from "zustand";
import type { Alert } from "@/types/domain";

interface AlertState {
  alerts: Alert[];
  unreadCount: number;
  setAlerts: (alerts: Alert[]) => void;
  applyPatch: (patchedAlerts: Alert[]) => void;
  acknowledgeAlert: (id: string) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 3,
  setAlerts: (alerts) =>
    set({
      alerts,
      unreadCount: alerts.filter((a) => !a.acknowledged).length
    }),
  applyPatch: (patchedAlerts) =>
    set((state) => {
      const map = new Map(state.alerts.map((a) => [a.id, a]));
      patchedAlerts.forEach((pa) => {
        map.set(pa.id, pa);
      });
      const nextAlerts = Array.from(map.values());
      return {
        alerts: nextAlerts,
        unreadCount: nextAlerts.filter((a) => !a.acknowledged).length
      };
    }),
  acknowledgeAlert: (id) =>
    set((state) => {
      const nextAlerts = state.alerts.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a
      );
      return {
        alerts: nextAlerts,
        unreadCount: nextAlerts.filter((a) => !a.acknowledged).length
      };
    })
}));
