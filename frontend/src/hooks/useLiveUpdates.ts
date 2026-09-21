import { useEffect, useState, useCallback } from "react";
import { useDataProvider } from "@/app/providers/DataProviderContext";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useRoadStore } from "@/stores/roadStore";
import { useIncidentStore } from "@/stores/incidentStore";
import { useShipmentStore } from "@/stores/shipmentStore";
import { useAlertStore } from "@/stores/alertStore";
import { useWeatherStore } from "@/stores/weatherStore";
import { useUiStore } from "@/stores/uiStore";
import { initialSnapshot } from "@/services/mock/seedData";

export function useLiveUpdates() {
  const { provider, sourceType, reconnectKey, triggerReconnect } = useDataProvider();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setVehicles = useVehicleStore((s) => s.setVehicles);
  const applyVehiclesPatch = useVehicleStore((s) => s.applyPatch);

  const setRoads = useRoadStore((s) => s.setRoads);
  const applyRoadsPatch = useRoadStore((s) => s.applyPatch);

  const setIncidents = useIncidentStore((s) => s.setIncidents);
  const applyIncidentsPatch = useIncidentStore((s) => s.applyPatch);

  const setShipments = useShipmentStore((s) => s.setShipments);
  const applyShipmentsPatch = useShipmentStore((s) => s.applyPatch);

  const setAlerts = useAlertStore((s) => s.setAlerts);
  const applyAlertsPatch = useAlertStore((s) => s.applyPatch);

  const setWeather = useWeatherStore((s) => s.setWeather);
  const applyWeatherPatch = useWeatherStore((s) => s.applyPatch);

  const setKpis = useUiStore((s) => s.setKpis);

  const retry = useCallback(() => {
    triggerReconnect();
  }, [triggerReconnect]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    async function init() {
      try {
        setError(null);
        const snapshot = await provider.connect();
        if (!isMounted) return;

        setVehicles(snapshot.vehicles);
        setRoads(snapshot.roads);
        setIncidents(snapshot.incidents);
        setShipments(snapshot.shipments, snapshot.routes);
        setAlerts(snapshot.alerts);
        setWeather(snapshot.weather);
        setKpis(snapshot.kpis);

        setIsConnected(true);
        setError(null);

        // Subscribe to live updates
        unsubscribe = provider.subscribe((patch) => {
          if (!isMounted) return;

          if (patch.vehicles) applyVehiclesPatch(patch.vehicles);
          if (patch.roads) applyRoadsPatch(patch.roads);
          if (patch.incidents) applyIncidentsPatch(patch.incidents);
          if (patch.shipments || patch.routes) {
            applyShipmentsPatch(patch.shipments, patch.routes);
          }
          if (patch.alerts) applyAlertsPatch(patch.alerts);
          if (patch.weather) applyWeatherPatch(patch.weather);
          if (patch.kpis) setKpis(patch.kpis);
        });
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : "Failed to connect to backend data provider";
          console.warn("useLiveUpdates connection error, loading cached baseline state:", message);
          setError(message);
          setIsConnected(false);

          // Demo map data disabled for production.
          // Kept for development/testing.
          if (sourceType === "mock") {
            setVehicles(initialSnapshot.vehicles);
            setRoads(initialSnapshot.roads);
            setIncidents(initialSnapshot.incidents);
            setShipments(initialSnapshot.shipments, initialSnapshot.routes);
            setAlerts(initialSnapshot.alerts);
            setWeather(initialSnapshot.weather);
            setKpis(initialSnapshot.kpis);
          }
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      provider.disconnect();
    };
  }, [
    provider,
    reconnectKey,
    setVehicles,
    applyVehiclesPatch,
    setRoads,
    applyRoadsPatch,
    setIncidents,
    applyIncidentsPatch,
    setShipments,
    applyShipmentsPatch,
    setAlerts,
    applyAlertsPatch,
    setWeather,
    applyWeatherPatch,
    setKpis
  ]);

  return { isConnected, error, sourceType, retry };
}
