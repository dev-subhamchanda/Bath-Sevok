import React, { useState } from "react";
import { useShipmentStore } from "@/stores/shipmentStore";
import { useDataProvider } from "@/app/providers/DataProviderContext";
import { useUiStore } from "@/stores/uiStore";

export const RouteComparisonPanel: React.FC = () => {
  const selectedShipmentId = useShipmentStore((s) => s.selectedShipmentId);
  const shipments = useShipmentStore((s) => s.shipments);
  const routes = useShipmentStore((s) => s.routes);
  const applyShipmentsPatch = useShipmentStore((s) => s.applyPatch);
  const { provider } = useDataProvider();
  const setIsReportModalOpen = useUiStore((s) => s.setIsReportModalOpen);

  const [isRerouting, setIsRerouting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const shipment = shipments.find((s) => s.id === selectedShipmentId) || shipments[0];
  if (!shipment) return null;

  const currentRoute = routes.find((r) => r.id === shipment.currentRouteId) || routes[0];
  const alternateRoute = routes.find((r) => r.id !== shipment.currentRouteId) || routes[1];

  const handleSwitchRoute = async (targetRouteId: string) => {
    setIsRerouting(true);
    setErrorMessage(null);
    try {
      const updated = await provider.requestReroute(shipment.id, targetRouteId);
      if (updated) {
        applyShipmentsPatch([updated]);
      }
      setSuccessMessage(`Consignment rerouted successfully via ${targetRouteId === "ROUTE-B" ? "Route B (Jowai Bypass)" : "Route A"}!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      console.error("Reroute error:", err);
      const msg = err instanceof Error ? err.message : "Reroute request failed";
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 6000);
    } finally {
      setIsRerouting(false);
    }
  };

  return (
    <div className="w-full lg:w-[420px] shrink-0 bg-white rounded-xl border border-[#e5e8ee] p-5 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-[#e5e8ee]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[#003356]">{shipment.id}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                shipment.priority === 1
                  ? "bg-[#ffdad6] text-[#ba1a1a]"
                  : "bg-[#cfe4ff] text-[#001d34]"
              }`}
            >
              Priority {shipment.priority}
            </span>
          </div>
          <p className="text-xs text-[#181c20] font-semibold mt-0.5">{shipment.commodity}</p>
          <p className="text-[11px] text-[#72777f]">
            {shipment.origin} ➔ {shipment.destination}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
            shipment.status === "on_time"
              ? "bg-[#e6f4ea] text-[#137333]"
              : shipment.status === "at_risk"
              ? "bg-[#fef3c7] text-[#92400e]"
              : "bg-[#ffdad6] text-[#ba1a1a]"
          }`}
        >
          {shipment.status.replace("_", " ")}
        </span>
      </div>

      {successMessage && (
        <div className="p-3 rounded-lg bg-[#e6f4ea] border border-[#34a853]/40 text-[#137333] text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#93000a] text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Flagship Route Comparison Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#003356] uppercase tracking-wider">
            AI Disruption Risk & Route Optimization
          </span>
          <span className="text-[10px] font-semibold text-[#005148] bg-[#e6f4ea] px-2 py-0.5 rounded-full">
            Model Conf: 96%
          </span>
        </div>

        {/* Route Option 1 (Current Route) */}
        {currentRoute && (
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              currentRoute.riskScore > 0.6
                ? "bg-[#ffdad6]/25 border-[#ffdad6]"
                : "bg-[#f8fafc] border-[#e5e8ee]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#181c20]">{currentRoute.name}</span>
              <span className="text-[10px] uppercase font-bold text-[#72777f] bg-[#ebeef4] px-1.5 py-0.5 rounded">
                Active Route
              </span>
            </div>
            <div className="text-[11px] text-[#42474e] mb-2">{currentRoute.via}</div>

            <div className="grid grid-cols-3 gap-2 text-[11px] bg-white p-2 rounded-lg border border-[#e5e8ee]">
              <div>
                <span className="text-[#72777f] block text-[10px]">Distance</span>
                <span className="font-bold text-[#181c20]">{currentRoute.distanceKm} km</span>
              </div>
              <div>
                <span className="text-[#72777f] block text-[10px]">Est. Time</span>
                <span className="font-bold text-[#181c20]">{currentRoute.estimatedMinutes} min</span>
              </div>
              <div>
                <span className="text-[#72777f] block text-[10px]">Disruption Risk</span>
                <span
                  className={`font-bold ${
                    currentRoute.riskScore > 0.6 ? "text-[#ba1a1a]" : "text-[#2e7d32]"
                  }`}
                >
                  {Math.round(currentRoute.riskScore * 100)}%
                </span>
              </div>
            </div>

            {currentRoute.reason && (
              <p className="text-[11px] text-[#ba1a1a] font-medium mt-2 leading-tight">
                {currentRoute.reason}
              </p>
            )}
          </div>
        )}

        {/* Route Option 2 (Alternate Route) */}
        {alternateRoute && (
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              alternateRoute.recommended
                ? "bg-[#f0fdf4] border-[#86efac] shadow-xs"
                : "bg-[#f8fafc] border-[#e5e8ee]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#003356]">{alternateRoute.name}</span>
              {alternateRoute.recommended && (
                <span className="text-[10px] uppercase font-bold text-[#15803D] bg-[#dcfce7] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  AI Recommended
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#42474e] mb-2">{alternateRoute.via}</div>

            <div className="grid grid-cols-3 gap-2 text-[11px] bg-white p-2 rounded-lg border border-[#e5e8ee]">
              <div>
                <span className="text-[#72777f] block text-[10px]">Distance</span>
                <span className="font-bold text-[#181c20]">{alternateRoute.distanceKm} km</span>
              </div>
              <div>
                <span className="text-[#72777f] block text-[10px]">Est. Time</span>
                <span className="font-bold text-[#181c20]">{alternateRoute.estimatedMinutes} min</span>
              </div>
              <div>
                <span className="text-[#72777f] block text-[10px]">Disruption Risk</span>
                <span className="font-bold text-[#15803D]">
                  {Math.round(alternateRoute.riskScore * 100)}%
                </span>
              </div>
            </div>

            {alternateRoute.reason && (
              <div className="p-2 mt-2 rounded bg-white text-[11px] font-medium text-[#15803D] border border-[#bbf7d0]">
                {alternateRoute.reason}
              </div>
            )}

            {/* Reroute CTA Button */}
            <button
              type="button"
              disabled={isRerouting}
              onClick={() => handleSwitchRoute(alternateRoute.id)}
              className="w-full mt-3 h-10 rounded-lg bg-[#005148] hover:bg-[#003832] text-white font-semibold text-xs shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">alt_route</span>
              <span>
                {isRerouting
                  ? "Recalculating Telemetry..."
                  : `Switch Route (Save 70% Disruption Risk)`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Auxiliary Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#e5e8ee]">
        <button
          type="button"
          onClick={() => alert(`Contacting Carrier Driver for Shipment ${shipment.id}...`)}
          className="flex-1 h-9 rounded-lg bg-[#f1f4fa] hover:bg-[#dfe3e8] text-[#003356] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">call</span>
          <span>Contact Driver</span>
        </button>

        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="flex-1 h-9 rounded-lg bg-[#fff1f2] hover:bg-[#ffe4e6] text-[#ba1a1a] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-[#fecdd3]"
        >
          <span className="material-symbols-outlined text-[16px]">report</span>
          <span>Report Issue</span>
        </button>
      </div>
    </div>
  );
};
