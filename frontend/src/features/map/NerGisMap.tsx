import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from "react-leaflet";
import { useRoadStore } from "@/stores/roadStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useIncidentStore } from "@/stores/incidentStore";
import { useUiStore } from "@/stores/uiStore";
import { useShipmentStore } from "@/stores/shipmentStore";
import { initialRoads, initialVehicles, initialIncidents } from "@/services/mock/seedData";
import { DashboardMapControlPanel } from "@/features/dashboard/DashboardMapControlPanel";
import {
  routeAlternativesApi,
  type ParsedAlternativeRoute,
  formatAxiosError
} from "@/services/api/apiClient";

import { createLiveUserGpsIcon } from "./mapMarkerIcons";
import { MapFloatingControls } from "./MapFloatingControls";
import { CorridorLayers } from "./CorridorLayers";
import { VehicleMapMarkers } from "./VehicleMapMarkers";
import { IncidentMapMarkers } from "./IncidentMapMarkers";
import { RoutePolylineLayer } from "./RoutePolylineLayer";
import { RouteAlternativesCard } from "./RouteAlternativesCard";

// Initial map view: focused closely on Assam (Guwahati / Central Assam logistics corridor)
const ASSAM_MAP_CENTER: [number, number] = [26.15, 91.80];
const ASSAM_INITIAL_ZOOM = 8.5;

// Helper component to control map panning and zooming from inside MapContainer
function MapController({
  centerCoords,
  zoom,
  triggerCenter
}: {
  centerCoords: [number, number];
  zoom: number;
  triggerCenter: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (triggerCenter > 0) {
      map.flyTo(centerCoords, zoom, {
        duration: 0.8,
        easeLinearity: 0.25
      });
    }
  }, [triggerCenter, centerCoords, zoom, map]);

  return null;
}

// Helper component to trigger map.invalidateSize() on fullscreen transition
function MapResizer({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap();

  useEffect(() => {
    const timer1 = setTimeout(() => map.invalidateSize({ animate: false }), 50);
    const timer2 = setTimeout(() => map.invalidateSize({ animate: false }), 200);
    const timer3 = setTimeout(() => map.invalidateSize({ animate: true }), 450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isFullscreen, map]);

  return null;
}

export const NerGisMap: React.FC = () => {
  const roadsFromStore = useRoadStore((s) => s.roads);
  const vehiclesFromStore = useVehicleStore((s) => s.vehicles);
  const incidentsFromStore = useIncidentStore((s) => s.incidents);
  const mapFilterChip = useUiStore((s) => s.mapFilterChip);
  const userGpsLocation = useUiStore((s) => s.userGpsLocation);

  // Sync with shipmentStore
  const shipments = useShipmentStore((s) => s.shipments);
  const selectedShipmentId = useShipmentStore((s) => s.selectedShipmentId);
  const storeRoutes = useShipmentStore((s) => s.routes);

  const activeShipment = useMemo(() => {
    return shipments.find((s) => s.id === selectedShipmentId) || shipments[0] || null;
  }, [shipments, selectedShipmentId]);

  // Fallback to initial seeds if store has not hydrated yet
  const roads = roadsFromStore.length > 0 ? roadsFromStore : initialRoads;
  const vehicles = vehiclesFromStore.length > 0 ? vehiclesFromStore : initialVehicles;
  const incidents = incidentsFromStore.length > 0 ? incidentsFromStore : initialIncidents;

  // Search state connected to DashboardMapControlPanel
  const [searchQuery, setSearchQuery] = useState("");

  // Fullscreen viewport state with Browser API + in-app overlay fallback
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapWrapperRef = React.useRef<HTMLDivElement | null>(null);

  const toggleFullscreen = useCallback(async () => {
    if (!isFullscreen) {
      if (mapWrapperRef.current?.requestFullscreen) {
        try {
          await mapWrapperRef.current.requestFullscreen();
        } catch {
          // Browser Fullscreen API denied or unsupported; in-app state handles it
        }
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // Ignore
        }
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFs = !!document.fullscreenElement;
      if (!isDocFs && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        toggleFullscreen();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);

  // Map viewport control state (Initial focus closely around Assam: 26.15° N, 91.80° E)
  const [targetCoords, setTargetCoords] = useState<[number, number]>(ASSAM_MAP_CENTER);
  const [targetZoom, setTargetZoom] = useState(ASSAM_INITIAL_ZOOM);
  const [triggerCenter, setTriggerCenter] = useState(0);

  // Route Alternatives state (POST /routes/alternatives)
  const [availableRoutes, setAvailableRoutes] = useState<ParsedAlternativeRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Derive origin and destination coordinates for the active shipment
  const activeOriginCoordinates: [number, number] = useMemo(() => {
    if (activeShipment?.originCoordinates && activeShipment.originCoordinates.length === 2) {
      return activeShipment.originCoordinates;
    }
    return [91.7362, 26.1445]; // Default: Guwahati [lng, lat]
  }, [activeShipment]);

  const activeDestinationCoordinates: [number, number] = useMemo(() => {
    if (activeShipment?.destinationCoordinates && activeShipment.destinationCoordinates.length === 2) {
      return activeShipment.destinationCoordinates;
    }
    return [91.8933, 25.5788]; // Default: Shillong [lng, lat]
  }, [activeShipment]);

  // Tracking from Fleet selects a shipment before opening this page.
  useEffect(() => {
    if (!selectedShipmentId || !activeShipment?.originCoordinates) return;
    setTargetCoords([activeShipment.originCoordinates[1], activeShipment.originCoordinates[0]]);
    setTargetZoom(11);
    setTriggerCenter((current) => current + 1);
  }, [selectedShipmentId, activeShipment]);

  // Manual refresh / retry handler for user interaction
  const fetchRouteAlternatives = useCallback(async () => {
    setIsLoadingRoutes(true);
    setRouteError(null);
    try {
      const routes = await routeAlternativesApi.fetchParsedAlternatives({
        origin: { type: "Point", coordinates: activeOriginCoordinates },
        destination: { type: "Point", coordinates: activeDestinationCoordinates }
      });
      if (routes && routes.length > 0) {
        setAvailableRoutes(routes);
        setSelectedRouteId((current) => {
          return routes.some((r) => r.id === current) ? current : routes[0].id;
        });
      } else {
        setRouteError("API returned no alternative routes.");
      }
    } catch (err: unknown) {
      console.error("Failed to load route alternatives:", err);
      const msg = formatAxiosError(err, "Failed to load route alternatives from backend.");
      setRouteError(msg);
    } finally {
      setIsLoadingRoutes(false);
    }
  }, [activeOriginCoordinates, activeDestinationCoordinates]);

  // Dynamically load calculated route for active shipment via backend OpenRouteService
  useEffect(() => {
    let isCancelled = false;

    // 1. Check if shipmentStore already has a cached route geometry for this shipment
    const cachedStoreRoute = storeRoutes.find(
      (r) =>
        (activeShipment && r.shipmentId === activeShipment.id) ||
        (activeShipment && r.id === activeShipment.currentRouteId)
    );

    if (cachedStoreRoute && cachedStoreRoute.geometry && cachedStoreRoute.geometry.length > 0) {
      const parsed: ParsedAlternativeRoute = {
        id: cachedStoreRoute.id,
        name: cachedStoreRoute.name,
        isAlternative: false,
        distanceKm: cachedStoreRoute.distanceKm,
        durationMinutes: cachedStoreRoute.estimatedMinutes,
        etaFormatted: `${Math.floor(cachedStoreRoute.estimatedMinutes / 60)}h ${Math.round(cachedStoreRoute.estimatedMinutes % 60)}m`,
        coordinates: cachedStoreRoute.geometry,
        rawGeoJsonCoordinates: cachedStoreRoute.geometry.map(([lat, lng]) => [lng, lat]),
        summary: `${cachedStoreRoute.distanceKm} km corridor connecting ${activeShipment?.origin || "origin"} and ${activeShipment?.destination || "destination"}`,
        via: cachedStoreRoute.via || `${activeShipment?.origin || "origin"} ➔ ${activeShipment?.destination || "destination"}`
      };
      const cacheTimeoutId = setTimeout(() => {
        if (!isCancelled) {
          setAvailableRoutes([parsed]);
          setSelectedRouteId(parsed.id);
        }
      }, 0);
      return () => {
        isCancelled = true;
        clearTimeout(cacheTimeoutId);
      };
    }

    // 2. Query backend OpenRouteService alternatives endpoint with GeoJSON [lng, lat]
    const timeoutId = setTimeout(() => {
      if (!isCancelled) {
        setIsLoadingRoutes(true);
      }
    }, 0);

    routeAlternativesApi
      .fetchParsedAlternatives({
        origin: { type: "Point", coordinates: activeOriginCoordinates },
        destination: { type: "Point", coordinates: activeDestinationCoordinates }
      })
      .then((routes) => {
        if (!isCancelled && routes && routes.length > 0) {
          setAvailableRoutes(routes);
          setSelectedRouteId(routes[0].id);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          console.error("Failed to load route alternatives:", err);
          setRouteError(formatAxiosError(err, "Failed to load route alternatives from backend."));
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingRoutes(false);
        }
      });

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    activeShipment,
    activeOriginCoordinates,
    activeDestinationCoordinates,
    storeRoutes
  ]);

  // Check if NH-6 is currently blocked in simulation
  const nh6Road = roads.find((r) => r.id === "NH-6");
  const isNh6Blocked = nh6Road?.status === "blocked";

  // Active selected route object
  const activeRoute = useMemo(() => {
    return (
      availableRoutes.find((r) => r.id === selectedRouteId) ||
      availableRoutes[0] ||
      null
    );
  }, [availableRoutes, selectedRouteId]);

  // Recenter map handlers (Focus back on Assam)
  const handleRecenter = useCallback(() => {
    setTargetCoords(ASSAM_MAP_CENTER);
    setTargetZoom(ASSAM_INITIAL_ZOOM);
    setTriggerCenter((c) => c + 1);
  }, []);

  const handleCenterMyLocation = useCallback(() => {
    setTargetCoords([25.7200, 91.8700]);
    setTargetZoom(11);
    setTriggerCenter((c) => c + 1);
  }, []);

  // Filter visibility helpers for roads and vehicles
  const isCorridorVisible = (status: string, corridorId?: string) => {
    if (mapFilterChip === "blocked" && status !== "blocked") return false;
    if (mapFilterChip === "at_risk" && status !== "at_risk" && status !== "under_observation") return false;
    if (searchQuery.trim() && corridorId) {
      const q = searchQuery.toLowerCase().trim();
      return corridorId.toLowerCase().includes(q) || status.toLowerCase().includes(q);
    }
    return true;
  };

  const isVehicleVisible = (vehicleId: string, vehicleName: string) => {
    if (mapFilterChip === "blocked") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        vehicleId.toLowerCase().includes(q) ||
        vehicleName.toLowerCase().includes(q) ||
        q === "fleet" ||
        q === "vehicle"
      );
    }
    return true;
  };

  // Road styling by condition status
  const getRoadStyle = (status: string) => {
    switch (status) {
      case "blocked":
        return { color: "#dc2626", weight: 6, dashArray: "6, 6" };
      case "at_risk":
      case "under_observation":
        return { color: "#d97706", weight: 5, dashArray: "8, 6" };
      default:
        return { color: "#15803d", weight: 5 };
    }
  };

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Primary Map Viewport with OpenStreetMap and Leaflet engine */}
      <div
        ref={mapWrapperRef}
        className={`transition-all duration-300 bg-slate-100 select-none overflow-hidden ${
          isFullscreen
            ? "fixed inset-0 z-[9999] w-screen h-screen rounded-none border-0 shadow-2xl"
            : "relative w-full h-[500px] sm:h-[600px] lg:h-[760px] rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,51,86,0.06)]"
        }`}
      >
        {/* Floating Exit Fullscreen Button in Fullscreen Mode */}
        {isFullscreen && (
          <div className="absolute top-3.5 right-3.5 z-[1001] pointer-events-auto animate-in fade-in">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/95 backdrop-blur-md text-[#003356] hover:bg-white hover:text-rose-700 font-bold text-xs shadow-[0_4px_16px_rgba(0,51,86,0.18)] border border-slate-200 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">fullscreen_exit</span>
              <span>Exit Fullscreen</span>
              <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 bg-slate-100 rounded">
                Esc
              </span>
            </button>
          </div>
        )}

        {/* Consolidated Unified Floating Control Panel (Active Fleet, At Risk, Blocked, SLA, Search) */}
        <DashboardMapControlPanel
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Real Leaflet Map Container centered closely around Assam */}
        <MapContainer
          center={ASSAM_MAP_CENTER}
          zoom={ASSAM_INITIAL_ZOOM}
          zoomSnap={0.5}
          minZoom={3}
          maxZoom={18}
          zoomControl={false}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          dragging={true}
          className="w-full h-full"
        >
          {/* OpenStreetMap Standard Tiles with proper attribution */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            maxZoom={19}
          />

          {/* Dynamic Map Resizer on fullscreen transitions */}
          <MapResizer isFullscreen={isFullscreen} />

          {/* Dynamic Map Controller for flyTo animation */}
          <MapController
            centerCoords={targetCoords}
            zoom={targetZoom}
            triggerCenter={triggerCenter}
          />

          {/* Minimal Floating Map Controls (+ / − zoom, location, recenter, fullscreen) */}
          <MapFloatingControls
            onCenterMyLocation={handleCenterMyLocation}
            onRecenter={handleRecenter}
            isMyLocationActive={!!userGpsLocation?.isLive}
            onToggleFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
          />

          {/* 1. NER Arterial Corridors (Road Polylines) */}
          <CorridorLayers
            roads={roads}
            isCorridorVisible={isCorridorVisible}
            getRoadStyle={getRoadStyle}
          />

          {/* 2. Active Selected Route & Alternatives Layer */}
          <RoutePolylineLayer
            activeRoute={activeRoute}
            availableRoutes={availableRoutes}
            selectedRouteId={selectedRouteId}
            onSelectRouteId={setSelectedRouteId}
            activeShipment={activeShipment}
            activeOriginCoordinates={activeOriginCoordinates}
            activeDestinationCoordinates={activeDestinationCoordinates}
          />

          {/* 3. Vehicle Markers */}
          <VehicleMapMarkers
            vehicles={vehicles}
            isVehicleVisible={isVehicleVisible}
            isNh6Blocked={isNh6Blocked}
          />

          {/* 4. Incident Markers */}
          <IncidentMapMarkers incidents={incidents} />

          {/* 5. Live User GPS Marker */}
          {userGpsLocation && (
            <Marker
              position={[userGpsLocation.lat, userGpsLocation.lng]}
              icon={createLiveUserGpsIcon()}
            >
              <Popup>
                <div className="p-2.5 font-sans min-w-[200px]">
                  <strong className="text-xs text-[#003356] font-bold">You (Field Officer Terminal)</strong>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {userGpsLocation.readableLocation || "Nongpoh Sector (KM 48)"}
                  </p>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    {userGpsLocation.lat.toFixed(4)}° N, {userGpsLocation.lng.toFixed(4)}° E (±{userGpsLocation.accuracy}m)
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Loading State Pill */}
        {isLoadingRoutes && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-200/80 flex items-center gap-2 text-xs font-semibold text-[#003356] pointer-events-none animate-in fade-in duration-150">
            <span className="w-3.5 h-3.5 border-2 border-[#003356] border-t-transparent rounded-full animate-spin" />
            <span>Calculating Route Alternatives...</span>
          </div>
        )}

        {/* Error State Banner */}
        {routeError && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] max-w-md w-[calc(100%-2rem)] bg-rose-50/95 backdrop-blur-md border border-rose-200 text-rose-900 px-3.5 py-2.5 rounded-xl shadow-lg flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">error</span>
              <span className="truncate">{routeError}</span>
            </div>
            <button
              type="button"
              onClick={fetchRouteAlternatives}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* 6. Floating Route Selection & Alternatives Overlay Card */}
        {activeRoute && (
          <RouteAlternativesCard
            activeRoute={activeRoute}
            availableRoutes={availableRoutes}
            selectedRouteId={selectedRouteId}
            onSelectRouteId={setSelectedRouteId}
            isLoadingRoutes={isLoadingRoutes}
            onRefreshRoutes={fetchRouteAlternatives}
            activeOriginCoordinates={activeOriginCoordinates}
            activeDestinationCoordinates={activeDestinationCoordinates}
            originName={activeShipment?.origin || "Guwahati"}
            destinationName={activeShipment?.destination || "Itanagar"}
          />
        )}
      </div>
    </div>
  );
};
