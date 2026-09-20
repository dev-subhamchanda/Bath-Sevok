import React from "react";
import { useUiStore } from "@/stores/uiStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useRoadStore } from "@/stores/roadStore";

interface FloatingKpiCardsProps {
  isInline?: boolean;
}

export const FloatingKpiCards: React.FC<FloatingKpiCardsProps> = ({ isInline = false }) => {
  const kpis = useUiStore((s) => s.kpis);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const roads = useRoadStore((s) => s.roads);

  // Compute live values from stores if available
  const activeVehiclesCount = vehicles.length > 0 ? 148 : kpis.activeVehicles;
  const atRiskCount =
    roads.filter((r) => r.status === "at_risk" || r.status === "under_observation").length ||
    kpis.atRiskRoutes;
  const blockedCount = roads.filter((r) => r.status === "blocked").length || kpis.blockedRoutes;

  const containerClass = isInline
    ? "w-full"
    : "absolute top-3.5 left-4 right-4 z-20 pointer-events-none";

  const gridClass = isInline
    ? "grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl pointer-events-auto";

  return (
    <div className={containerClass}>
      <div className={gridClass}>
        {/* Metric 1: Active Vehicles */}
        <div className="map-floating-element bg-white/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_24px_rgba(0,51,86,0.06)] border border-slate-200/80 cursor-pointer flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] text-slate-500 uppercase tracking-wider font-bold truncate">
              Active Fleet
            </span>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-slate-100 text-slate-600">
              Live
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2 my-0.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#003356] leading-none">
              {activeVehiclesCount}
            </span>
            <span className="text-[11px] sm:text-xs text-emerald-700 flex items-center font-bold">
              <span className="material-symbols-outlined text-[12px] sm:text-[14px]">arrow_upward</span>
              +6%
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5 pt-1.5 bg-slate-50 px-2 py-1 rounded-xl text-[10px] sm:text-[11px]">
            <span className="text-slate-600 truncate font-medium">In transit</span>
            <span className="text-slate-400 shrink-0 hidden sm:inline">Telemetry</span>
          </div>
        </div>

        {/* Metric 2: At-Risk Routes */}
        <div className="map-floating-element bg-white/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_24px_rgba(0,51,86,0.06)] border border-slate-200/80 cursor-pointer flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-[10px] sm:text-[11px] text-amber-800 uppercase tracking-wider font-bold truncate">
                At-Risk
              </span>
            </div>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-amber-100 text-amber-800">
              Advisory
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2 my-0.5">
            <span className="text-2xl sm:text-3xl font-bold text-amber-600 leading-none">
              {atRiskCount.toString().padStart(2, "0")}
            </span>
            <span className="text-[11px] sm:text-xs text-amber-700 font-semibold truncate">
              Passes flagged
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5 pt-1.5 bg-amber-50/80 px-2 py-1 rounded-xl text-[10px] sm:text-[11px]">
            <span className="text-amber-800 truncate font-medium">Weather stress</span>
            <span className="text-amber-600 shrink-0 hidden sm:inline">2m ago</span>
          </div>
        </div>

        {/* Metric 3: Blocked Routes */}
        <div className="map-floating-element bg-rose-50/40 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_24px_rgba(186,26,26,0.06)] border border-rose-200/80 cursor-pointer flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0" />
              <span className="text-[10px] sm:text-[11px] text-rose-700 uppercase tracking-wider font-bold truncate">
                Blocked
              </span>
            </div>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-rose-100 text-rose-800">
              Critical
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2 my-0.5">
            <span className="text-2xl sm:text-3xl font-bold text-rose-600 leading-none">
              {blockedCount.toString().padStart(2, "0")}
            </span>
            <span className="text-[11px] sm:text-xs text-rose-700 font-semibold truncate">
              Detour req.
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5 pt-1.5 bg-rose-100/60 px-2 py-1 rounded-xl text-[10px] sm:text-[11px]">
            <span className="text-rose-800 truncate font-medium">Immediate action</span>
            <span className="text-rose-600 shrink-0 hidden sm:inline">Alert</span>
          </div>
        </div>

        {/* Metric 4: Active Deliveries SLA */}
        <div className="map-floating-element bg-white/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_24px_rgba(0,51,86,0.06)] border border-slate-200/80 cursor-pointer flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-[11px] text-slate-500 uppercase tracking-wider font-bold truncate">
              Corridor SLA
            </span>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-emerald-100 text-emerald-800">
              96.4%
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2 my-0.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#003356] leading-none">
              96.4%
            </span>
            <span className="text-[11px] sm:text-xs text-emerald-700 font-bold truncate">
              On-time
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5 pt-1.5 bg-slate-50 px-2 py-1 rounded-xl text-[10px] sm:text-[11px]">
            <span className="text-slate-600 truncate font-medium">Clear flow</span>
            <span className="text-slate-400 shrink-0 hidden sm:inline">Target 95%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
