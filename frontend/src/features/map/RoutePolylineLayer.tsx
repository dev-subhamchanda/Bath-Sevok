import React, { useEffect, useRef } from "react";
import { Polyline, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { Shipment } from "@/types/domain";
import type { ParsedAlternativeRoute } from "@/services/api/apiClient";
import { createEndpointIcon, createVehicleIcon } from "./mapMarkerIcons";

interface RoutePolylineLayerProps {
  activeRoute: ParsedAlternativeRoute | null;
  availableRoutes: ParsedAlternativeRoute[];
  selectedRouteId: string;
  onSelectRouteId: (id: string) => void;
  activeShipment: Shipment | null;
  activeOriginCoordinates: [number, number];
  activeDestinationCoordinates: [number, number];
}

// Helper component to automatically fit map bounds to the active route polyline
function RouteBoundsFitter({
  routeCoordinates,
  activeRouteId
}: {
  routeCoordinates: [number, number][];
  activeRouteId?: string;
}) {
  const map = useMap();
  const prevIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 0 && prevIdRef.current !== activeRouteId) {
      prevIdRef.current = activeRouteId;
      const latLngs = routeCoordinates.map(([lat, lng]) => L.latLng(lat, lng));
      const bounds = L.latLngBounds(latLngs);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 13,
          animate: true,
          duration: 0.8
        });
      }
    }
  }, [routeCoordinates, activeRouteId, map]);

  return null;
}

export const RoutePolylineLayer: React.FC<RoutePolylineLayerProps> = ({
  activeRoute,
  availableRoutes,
  selectedRouteId,
  onSelectRouteId,
  activeShipment,
  activeOriginCoordinates,
  activeDestinationCoordinates
}) => {
  return (
    <>
      {/* Automatic Bounds Fitter for complete route visibility */}
      {activeRoute && activeRoute.coordinates.length > 0 && (
        <RouteBoundsFitter
          routeCoordinates={activeRoute.coordinates}
          activeRouteId={activeRoute.id}
        />
      )}

      {/* Active Route Polyline */}
      {activeRoute && activeRoute.coordinates.length > 0 && (
        <>
          {/* Casing / Halo for active route */}
          <Polyline
            positions={activeRoute.coordinates}
            pathOptions={{
              color: "#ffffff",
              weight: 9,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round"
            }}
          />
          {/* Active Route Colored Line */}
          <Polyline
            positions={activeRoute.coordinates}
            pathOptions={{
              color: "#005148",
              weight: 6,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round"
            }}
          >
            <Tooltip sticky>
              <div className="font-sans text-xs">
                <strong className="font-bold text-[#003356]">{activeRoute.name}</strong>
                <div className="text-[11px] text-slate-600">
                  Distance: {activeRoute.distanceKm} km • Duration: {activeRoute.etaFormatted}
                </div>
                <div className="text-[10px] text-slate-400">
                  {activeRoute.coordinates.length} waypoints (GeoJSON converted to Leaflet)
                </div>
              </div>
            </Tooltip>
            <Popup>
              <div className="p-3 font-sans min-w-[220px]">
                <span className="text-xs font-bold text-[#003356]">{activeRoute.name}</span>
                <p className="text-[11px] text-slate-600 mt-1">{activeRoute.summary}</p>
                <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1 text-[11px]">
                  <div>
                    Distance: <strong>{activeRoute.distanceKm} km</strong>
                  </div>
                  <div>
                    Duration: <strong>{activeRoute.etaFormatted}</strong>
                  </div>
                </div>
              </div>
            </Popup>
          </Polyline>
        </>
      )}

      {/* Inactive Alternative Route Polylines (Dashed lines, click to select) */}
      {availableRoutes.map((r) => {
        if (r.id === selectedRouteId || r.coordinates.length === 0) return null;
        return (
          <Polyline
            key={`alt-${r.id}`}
            positions={r.coordinates}
            eventHandlers={{
              click: () => onSelectRouteId(r.id)
            }}
            pathOptions={{
              color: "#64748b",
              weight: 4,
              dashArray: "8, 6",
              opacity: 0.75,
              lineCap: "round"
            }}
          >
            <Tooltip sticky>
              <div className="font-sans text-xs">
                <strong className="font-semibold text-slate-700">{r.name} (Click to select)</strong>
                <div className="text-[10px] text-slate-500">
                  {r.distanceKm} km • {r.etaFormatted}
                </div>
              </div>
            </Tooltip>
          </Polyline>
        );
      })}

      {/* Dynamic Origin Marker */}
      <Marker
        position={
          activeRoute && activeRoute.coordinates.length > 0
            ? activeRoute.coordinates[0]
            : [activeOriginCoordinates[1], activeOriginCoordinates[0]]
        }
        icon={createEndpointIcon(`Origin: ${activeShipment?.origin || "Guwahati"}`, true)}
      >
        <Popup>
          <div className="p-2.5 font-sans min-w-[220px]">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-1">
              <span className="material-symbols-outlined text-[16px]">warehouse</span>
              <span>Origin: {activeShipment?.origin || "Guwahati Central Depot"}</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Consignment departure node at [{activeOriginCoordinates[0].toFixed(4)}, {activeOriginCoordinates[1].toFixed(4)}].
            </p>
            {activeShipment && (
              <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-col gap-0.5 text-[10px] text-slate-500">
                <div>
                  Consignment: <strong className="font-mono text-slate-700">{activeShipment.id}</strong>
                </div>
                <div>
                  Driver: <strong className="text-slate-700">{activeShipment.driverName || "Official Driver"}</strong>
                </div>
              </div>
            )}
          </div>
        </Popup>
      </Marker>

      {/* Dynamic Destination Marker */}
      <Marker
        position={
          activeRoute && activeRoute.coordinates.length > 0
            ? activeRoute.coordinates[activeRoute.coordinates.length - 1]
            : [activeDestinationCoordinates[1], activeDestinationCoordinates[0]]
        }
        icon={createEndpointIcon(`Destination: ${activeShipment?.destination || "Shillong"}`, false)}
      >
        <Popup>
          <div className="p-2.5 font-sans min-w-[220px]">
            <div className="flex items-center gap-1.5 text-[#003356] font-bold text-xs mb-1">
              <span className="material-symbols-outlined text-[16px]">pin_drop</span>
              <span>Destination: {activeShipment?.destination || "Shillong Terminal"}</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Consignment terminal at [{activeDestinationCoordinates[0].toFixed(4)}, {activeDestinationCoordinates[1].toFixed(4)}].
            </p>
            {activeRoute && (
              <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                <span>Distance: {activeRoute.distanceKm} km</span>
                <span>ETA: {activeRoute.etaFormatted}</span>
              </div>
            )}
          </div>
        </Popup>
      </Marker>

      {/* Assigned Driver / Vehicle on Route Marker */}
      {activeShipment && activeShipment.driverName && (
        <Marker
          position={
            activeRoute && activeRoute.coordinates.length > 2
              ? activeRoute.coordinates[Math.floor(activeRoute.coordinates.length * 0.25)]
              : [activeOriginCoordinates[1], activeOriginCoordinates[0]]
          }
          icon={createVehicleIcon(activeShipment.vehicleNumber || activeShipment.vehicleId || "FW-18", false)}
        >
          <Popup>
            <div className="p-3 font-sans min-w-[230px]">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-bold text-xs text-[#003356] font-mono">
                  {activeShipment.vehicleNumber || activeShipment.vehicleId}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                  Assigned Driver
                </span>
              </div>
              <div className="flex items-center gap-2.5 my-2">
                {activeShipment.driverPhotoUrl ? (
                  <img
                    src={activeShipment.driverPhotoUrl}
                    alt={activeShipment.driverName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#003356]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#003356] text-white flex items-center justify-center font-bold text-xs">
                    {activeShipment.driverName[0]}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">{activeShipment.driverName}</div>
                  <div className="text-[11px] text-[#174a73] font-semibold">
                    {activeShipment.driverPhone || "+91 94361 78921"}
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px] text-slate-600">
                <div>
                  Consignment: <strong className="text-slate-800">{activeShipment.id}</strong>
                </div>
                <div>
                  Corridor: <strong>{activeShipment.origin} ➔ {activeShipment.destination}</strong>
                </div>
                {activeRoute && (
                  <div className="text-emerald-700 font-semibold">
                    Distance: {activeRoute.distanceKm} km • ETA: {activeRoute.etaFormatted}
                  </div>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
};
