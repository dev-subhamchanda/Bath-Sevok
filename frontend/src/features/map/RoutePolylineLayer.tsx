import React, { useEffect, useRef, useMemo } from "react";
import { Polyline, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { Shipment, Vehicle } from "@/types/domain";
import {
  createConsumerDeliveryVehicleIcon,
  createConsumerDestinationIcon,
  createEndpointIcon
} from "./mapMarkerIcons";

interface RoutePolylineLayerProps {
  shipments: Shipment[];
  vehicles?: Vehicle[];
  selectedShipmentId: string | null;
  onSelectShipment: (id: string) => void;
}

// Automatically fits map bounds to the vehicle, route, and destination
function RouteBoundsFitter({
  points,
  targetKey
}: {
  points: [number, number][];
  targetKey?: string;
}) {
  const map = useMap();
  const prevKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (points && points.length > 0 && prevKeyRef.current !== targetKey) {
      prevKeyRef.current = targetKey;
      const latLngs = points.map(([lat, lng]) => L.latLng(lat, lng));
      const bounds = L.latLngBounds(latLngs);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [70, 70],
          maxZoom: 13,
          animate: true,
          duration: 0.8
        });
      }
    }
  }, [points, targetKey, map]);

  return null;
}

export const RoutePolylineLayer: React.FC<RoutePolylineLayerProps> = ({
  shipments,
  vehicles = [],
  selectedShipmentId,
  onSelectShipment
}) => {
  // 1. Filter all active real deliveries from backend
  const activeDeliveries = useMemo(() => {
    return shipments.filter((s) => {
      // If user explicitly selected this delivery, always show even if completed
      if (s.id === selectedShipmentId) return true;
      // Filter out delivered or cancelled
      const bStatus = (s.backendStatus || s.status || "").toUpperCase();
      if (bStatus === "DELIVERED" || bStatus === "CANCELLED" || s.status === "delivered") {
        return false;
      }
      // Must have valid origin & destination coordinates
      const hasOrigin =
        Array.isArray(s.originCoordinates) &&
        s.originCoordinates.length === 2 &&
        Number.isFinite(s.originCoordinates[0]) &&
        Number.isFinite(s.originCoordinates[1]);
      const hasDest =
        Array.isArray(s.destinationCoordinates) &&
        s.destinationCoordinates.length === 2 &&
        Number.isFinite(s.destinationCoordinates[0]) &&
        Number.isFinite(s.destinationCoordinates[1]);
      return hasOrigin && hasDest;
    });
  }, [shipments, selectedShipmentId]);

  // Selected delivery object
  const selectedDelivery = useMemo(() => {
    if (!selectedShipmentId) return null;
    return (
      activeDeliveries.find((s) => s.id === selectedShipmentId) ||
      shipments.find((s) => s.id === selectedShipmentId) ||
      null
    );
  }, [activeDeliveries, shipments, selectedShipmentId]);

  // Helper to determine vehicle location for a shipment
  const getVehicleLocation = (s: Shipment): [number, number] => {
    // 1. Check if assigned vehicle exists in vehicle store with live coordinates from backend/WebSocket
    const assignedV = vehicles.find(
      (v) =>
        (s.vehicleId && v.id === s.vehicleId) ||
        (s.vehicleNumber && (v.name?.includes(s.vehicleNumber) || v.id === s.vehicleNumber))
    );
    if (
      assignedV &&
      typeof assignedV.lat === "number" &&
      typeof assignedV.lng === "number" &&
      Number.isFinite(assignedV.lat) &&
      Number.isFinite(assignedV.lng)
    ) {
      console.log("[Vehicle Position]", s.id, "live GPS:", [assignedV.lat, assignedV.lng]);
      return [assignedV.lat, assignedV.lng];
    }

    // 2. If delivery is pending or live GPS not yet reported, position vehicle at start of actual road route
    if (s.routeGeometry && s.routeGeometry.length > 0) {
      console.log("[Vehicle Position]", s.id, "route start point:", s.routeGeometry[0]);
      return s.routeGeometry[0];
    }

    // 3. Fallback to origin point
    if (
      Array.isArray(s.originCoordinates) &&
      s.originCoordinates.length === 2 &&
      Number.isFinite(s.originCoordinates[0]) &&
      Number.isFinite(s.originCoordinates[1])
    ) {
      return [s.originCoordinates[1], s.originCoordinates[0]];
    }

    return [26.15, 91.80];
  };

  // Helper to get road-following route coordinates for a shipment
  const getDeliveryRouteCoordinates = (s: Shipment): [number, number][] => {
    // Use the actual road route geometry returned by backend OpenRouteService
    if (s.routeGeometry && s.routeGeometry.length >= 2) {
      return s.routeGeometry;
    }

    // IMPORTANT: STRAIGHT-LINE FALLBACK DISABLED.
    // If route geometry is unavailable, do NOT draw a fake straight line between origin & destination.
    console.log("[Route Debug]", s.id, "road route geometry unavailable");
    return [];
  };

  const otherDeliveries = useMemo(() => {
    if (!selectedShipmentId) return activeDeliveries;
    return activeDeliveries.filter((s) => s.id !== selectedShipmentId);
  }, [activeDeliveries, selectedShipmentId]);

  return (
    <>
      {/* If a shipment is selected for tracking, fit map bounds to its road route + vehicle + destination */}
      {selectedDelivery && (
        (() => {
          const selVehicleLoc = getVehicleLocation(selectedDelivery);
          const selDestLoc: [number, number] = [
            selectedDelivery.destinationCoordinates![1],
            selectedDelivery.destinationCoordinates![0]
          ];
          const selRoute = getDeliveryRouteCoordinates(selectedDelivery);
          const boundsPoints: [number, number][] =
            selRoute.length > 0 ? selRoute : [selVehicleLoc, selDestLoc];

          return (
            <RouteBoundsFitter
              points={boundsPoints}
              targetKey={`tracking-${selectedDelivery.id}`}
            />
          );
        })()
      )}

      {/* 1. Render all other active deliveries (so multiple active shipments remain visible) */}
      {otherDeliveries.map((s) => {
        const vehicleLoc = getVehicleLocation(s);
        const destLoc: [number, number] = [s.destinationCoordinates![1], s.destinationCoordinates![0]];
        const routeCoords = getDeliveryRouteCoordinates(s);

        return (
          <React.Fragment key={`active-delivery-${s.id}`}>
            {/* Road-following Route Polyline */}
            {routeCoords.length > 1 && (
              <>
                <Polyline
                  positions={routeCoords}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 6,
                    opacity: 0.7,
                    lineCap: "round",
                    lineJoin: "round"
                  }}
                />
                <Polyline
                  positions={routeCoords}
                  eventHandlers={{
                    click: () => onSelectShipment(s.id)
                  }}
                  pathOptions={{
                    color: "#0284c7",
                    weight: 4,
                    opacity: 0.85,
                    lineCap: "round",
                    lineJoin: "round"
                  }}
                >
                  <Tooltip sticky>
                    <div className="font-sans text-xs">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-[#003356] font-mono">{s.id}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                          {s.backendStatus || s.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-800 font-semibold">
                        {s.origin} ➔ {s.destination}
                      </div>
                      <div className="text-[10px] text-[#0284c7] font-semibold mt-1">
                        Click route to track this delivery
                      </div>
                    </div>
                  </Tooltip>
                </Polyline>
              </>
            )}

            {/* Destination Marker 📍 */}
            <Marker
              position={destLoc}
              icon={createConsumerDestinationIcon(s.destination, false)}
              eventHandlers={{
                click: () => onSelectShipment(s.id)
              }}
            />

            {/* Vehicle Marker 🚚 (sitting on road route) */}
            <Marker
              position={vehicleLoc}
              icon={createConsumerDeliveryVehicleIcon(
                s.vehicleNumber || s.vehicleId || s.id,
                s.driverName,
                false
              )}
              eventHandlers={{
                click: () => onSelectShipment(s.id)
              }}
            >
              <Tooltip sticky>
                <div className="font-sans text-xs">
                  <span className="font-bold text-[#003356]">{s.vehicleNumber || s.vehicleId}</span>
                  <div className="text-[11px] text-slate-600">
                    {s.origin} ➔ {s.destination}
                  </div>
                  <div className="text-[10px] text-[#0284c7] font-semibold mt-0.5">
                    Click to track
                  </div>
                </div>
              </Tooltip>
            </Marker>
          </React.Fragment>
        );
      })}

      {/* 2. Render Selected/Tracked Delivery prominently on top */}
      {selectedDelivery && (
        (() => {
          const selVehicleLoc = getVehicleLocation(selectedDelivery);
          const selDestLoc: [number, number] = [
            selectedDelivery.destinationCoordinates![1],
            selectedDelivery.destinationCoordinates![0]
          ];
          const selRoute = getDeliveryRouteCoordinates(selectedDelivery);
          const bStatus = (selectedDelivery.backendStatus || selectedDelivery.status || "").toUpperCase();
          const hasDeparted = bStatus === "IN_TRANSIT" || bStatus === "DELIVERED";

          return (
            <React.Fragment key={`tracked-delivery-${selectedDelivery.id}`}>
              {/* Highlighted Road-following Route Polyline */}
              {selRoute.length > 1 && (
                <>
                  {/* White halo casing */}
                  <Polyline
                    positions={selRoute}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 9,
                      opacity: 0.95,
                      lineCap: "round",
                      lineJoin: "round"
                    }}
                  />
                  {/* Clean Consumer Brand Route Line */}
                  <Polyline
                    positions={selRoute}
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
                        <div className="font-bold text-[#003356]">
                          {selectedDelivery.origin} ➔ {selectedDelivery.destination}
                        </div>
                        <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                          Vehicle: {selectedDelivery.vehicleNumber || selectedDelivery.vehicleId || "Active Unit"}
                        </div>
                        {selectedDelivery.routeDistanceKm && (
                          <div className="text-[10px] text-slate-500">
                            {selectedDelivery.routeDistanceKm} km corridor
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  </Polyline>
                </>
              )}

              {/* Departure Origin Marker */}
              {!hasDeparted && (
                <Marker
                  position={[selectedDelivery.originCoordinates![1], selectedDelivery.originCoordinates![0]]}
                  icon={createEndpointIcon(`Origin: ${selectedDelivery.origin}`, true)}
                >
                  <Popup>
                    <div className="p-2 font-sans text-xs">
                      <strong>Origin: {selectedDelivery.origin}</strong>
                      <p className="text-slate-500 text-[11px] mt-0.5">Consignment departure point</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Destination Marker 📍 */}
              <Marker
                position={selDestLoc}
                icon={createConsumerDestinationIcon(selectedDelivery.destination, true)}
              >
                <Popup>
                  <div className="p-2.5 font-sans min-w-[200px] text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                      <span>📍</span>
                      <span>Destination: {selectedDelivery.destination}</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Final delivery terminal for consignment <strong className="font-mono">{selectedDelivery.id}</strong>.
                    </p>
                  </div>
                </Popup>
              </Marker>

              {/* Vehicle Marker 🚚 (Prominent tracking style, sitting on route) */}
              <Marker
                position={selVehicleLoc}
                icon={createConsumerDeliveryVehicleIcon(
                  selectedDelivery.vehicleNumber || selectedDelivery.vehicleId || "Delivery Vehicle",
                  selectedDelivery.driverName,
                  true
                )}
              >
                <Popup>
                  <div className="p-2.5 font-sans min-w-[220px] text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-[#003356] font-mono">
                        {selectedDelivery.vehicleNumber || selectedDelivery.vehicleId || "Assigned Unit"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        {bStatus}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-700 flex flex-col gap-0.5">
                      <div>
                        Driver: <strong>{selectedDelivery.driverName || "Official Driver"}</strong>
                      </div>
                      <div>
                        Consignment: <strong className="font-mono">{selectedDelivery.id}</strong>
                      </div>
                      <div>
                        Payload: <span>{selectedDelivery.commodity}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })()
      )}
    </>
  );
};
