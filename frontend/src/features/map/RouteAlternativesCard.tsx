import React, { useState } from "react";
import type { ParsedAlternativeRoute } from "@/services/api/apiClient";

interface RouteAlternativesCardProps {
  activeRoute: ParsedAlternativeRoute;
  availableRoutes: ParsedAlternativeRoute[];
  selectedRouteId: string;
  onSelectRouteId: (id: string) => void;
  isLoadingRoutes: boolean;
  onRefreshRoutes: () => void;
  activeOriginCoordinates: [number, number];
  activeDestinationCoordinates: [number, number];
  originName: string;
  destinationName: string;
}

export const RouteAlternativesCard: React.FC<RouteAlternativesCardProps> = ({
  activeRoute,
  availableRoutes,
  selectedRouteId,
  onSelectRouteId,
  isLoadingRoutes,
  onRefreshRoutes,
  activeOriginCoordinates,
  activeDestinationCoordinates,
  originName,
  destinationName
}) => {
  const [isRouteCardCollapsed, setIsRouteCardCollapsed] = useState(false);

  return (
    <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 z-[1000] pointer-events-auto max-w-sm sm:max-w-md w-[calc(100%-1.5rem)] sm:w-auto">
      <div className="map-floating-element bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_4px_20px_rgba(0,51,86,0.12)] border border-slate-200/80 overflow-hidden select-none transition-all duration-200">
        {/* Header Bar with Minimize/Expand Toggle & Refresh Button */}
        <div className="px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-[#005148]/10 text-[#005148] flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">alt_route</span>
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#003356] truncate">
                {originName} ➔ {destinationName} Corridor
              </span>
              <span className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                <span>Dynamic Route Engine</span>
                <span>•</span>
                <span className="font-mono text-emerald-700 font-semibold">
                  {activeRoute.coordinates.length} waypoints
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onRefreshRoutes}
              disabled={isLoadingRoutes}
              className="p-1 text-slate-400 hover:text-[#003356] hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh route alternatives from API"
            >
              <span className={`material-symbols-outlined text-[17px] ${isLoadingRoutes ? "animate-spin" : ""}`}>
                refresh
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsRouteCardCollapsed(!isRouteCardCollapsed)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              title={isRouteCardCollapsed ? "Expand route panel" : "Collapse route panel"}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isRouteCardCollapsed ? "expand_less" : "expand_more"}
              </span>
            </button>
          </div>
        </div>

        {/* Card Body */}
        {!isRouteCardCollapsed && (
          <div className="p-3 flex flex-col gap-2.5">
            {/* Route Selection Tabs / Alternatives */}
            {availableRoutes.length > 1 ? (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-xl">
                {availableRoutes.map((r) => {
                  const isSelected = r.id === selectedRouteId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onSelectRouteId(r.id)}
                      className={`px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                        isSelected
                          ? "bg-white text-[#003356] shadow-xs font-semibold ring-1 ring-slate-200/80"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold truncate">{r.name}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#005148] shrink-0" />}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {r.distanceKm} km • {r.etaFormatted}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-2 bg-emerald-50/80 border border-emerald-200/70 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-900">{activeRoute.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  Active Route
                </span>
              </div>
            )}

            {/* Active Route Specs Ribbon */}
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="material-symbols-outlined text-[16px] text-slate-400">straighten</span>
                <span>
                  Distance: <strong className="font-semibold text-slate-900">{activeRoute.distanceKm} km</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="material-symbols-outlined text-[16px] text-slate-400">schedule</span>
                <span>
                  Duration: <strong className="font-semibold text-slate-900">{activeRoute.etaFormatted}</strong>
                </span>
              </div>
            </div>

            {/* Route Origin & Destination Geocodes */}
            <div className="text-[11px] text-slate-600 flex flex-col gap-1 px-1 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">Origin:</span>
                <span className="text-slate-600 truncate">
                  {originName} [{activeOriginCoordinates[0].toFixed(4)}, {activeOriginCoordinates[1].toFixed(4)}]
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#003356] shrink-0" />
                <span className="font-semibold text-slate-800">Destination:</span>
                <span className="text-slate-600 truncate">
                  {destinationName} [{activeDestinationCoordinates[0].toFixed(4)}, {activeDestinationCoordinates[1].toFixed(4)}]
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
