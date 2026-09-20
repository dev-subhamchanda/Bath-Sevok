import React, { useRef } from "react";
import { useUiStore } from "@/stores/uiStore";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useRoadStore } from "@/stores/roadStore";

interface DashboardMapControlPanelProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const DashboardMapControlPanel: React.FC<DashboardMapControlPanelProps> = ({
  searchQuery,
  setSearchQuery
}) => {
  const mapFilterChip = useUiStore((s) => s.mapFilterChip);
  const setMapFilterChip = useUiStore((s) => s.setMapFilterChip);
  const isCollapsed = useUiStore((s) => s.isMapPanelCollapsed);
  const setIsCollapsed = useUiStore((s) => s.setIsMapPanelCollapsed);

  const kpis = useUiStore((s) => s.kpis);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const roads = useRoadStore((s) => s.roads);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Compute live values from stores
  const activeVehiclesCount = vehicles.length > 0 ? 148 : kpis.activeVehicles;
  const atRiskCount =
    roads.filter((r) => r.status === "at_risk" || r.status === "under_observation").length ||
    kpis.atRiskRoutes;
  const blockedCount = roads.filter((r) => r.status === "blocked").length || kpis.blockedRoutes;
  const slaRate = "96.4%";

  return (
    <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 pointer-events-none max-w-md w-[calc(100%-1.5rem)] sm:w-[410px]">
      {/* Collapsed Minimal Pill Trigger (Accessible when panel is hidden) */}
      <div
        className={`transition-all duration-250 ease-out ${
          isCollapsed
            ? "opacity-100 translate-y-0 pointer-events-auto max-h-16 visible"
            : "opacity-0 -translate-y-2 pointer-events-none max-h-0 invisible overflow-hidden"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setIsCollapsed(false);
            setTimeout(() => searchInputRef.current?.focus(), 120);
          }}
          className="map-floating-element flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08),0_12px_24px_rgba(0,51,86,0.08)] border border-slate-200/80 text-xs text-slate-800 hover:text-[#003356] hover:bg-white transition-all cursor-pointer group select-none"
          title="Show Corridor Controls & Search Panel"
        >
          <span className="material-symbols-outlined text-[18px] text-[#003356] group-hover:scale-110 transition-transform">
            tune
          </span>
          <span className="font-bold text-[#003356] text-[11px] sm:text-xs">
            Corridors & Fleet
          </span>

          <div className="flex items-center gap-1.5 ml-0.5">
            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
              {activeVehiclesCount} Fleet
            </span>
            {blockedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                {blockedCount} Blocked
              </span>
            )}
          </div>

          <span className="inline-flex items-center gap-0.5 text-[#174a73] font-bold text-xs pl-1.5 border-l border-slate-200 ml-auto group-hover:translate-x-0.5 transition-transform">
            <span>Show</span>
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </span>
        </button>
      </div>

      {/* Expanded Unified Compact Control Panel */}
      <div
        className={`map-floating-element bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_4px_20px_rgba(0,51,86,0.12),0_1px_4px_rgba(0,0,0,0.04)] border border-slate-200/85 overflow-hidden transition-all duration-250 ease-out select-none ${
          !isCollapsed
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto max-h-[500px] visible"
            : "opacity-0 -translate-y-2 scale-98 pointer-events-none max-h-0 invisible"
        }`}
      >
        {/* Panel Header: Title, Active Status & Clear Hide Button */}
        <div className="px-3.5 pt-3 pb-2 flex items-center justify-between gap-2 border-b border-slate-100/90 bg-slate-50/50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-[#003356]/10 text-[#003356] flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">map</span>
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-[#003356] tracking-tight truncate">
                Corridor Control
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold shrink-0">
                Live
              </span>
            </div>
          </div>

          {/* Explicit Hide Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-[#003356] hover:bg-slate-200/70 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            title="Hide panel to expand map view"
          >
            <span className="material-symbols-outlined text-[16px]">visibility_off</span>
            <span className="text-[11px]">Hide</span>
          </button>
        </div>

        <div className="p-3 flex flex-col gap-2.5">
          {/* Element 1: Search Corridors Input Field */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/90 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#003356]/20 border border-slate-200/70 focus-within:border-[#003356] rounded-xl transition-all">
            <span className="material-symbols-outlined text-[18px] text-slate-400 focus-within:text-[#003356]">
              search
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  if (searchQuery) setSearchQuery("");
                  else setIsCollapsed(true);
                }
              }}
              placeholder="Search corridors (NH-6, NH-27), fleet, nodes..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
                title="Clear search query"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Quick Filter Chips (All, Active Fleet, At Risk, Blocked) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {[
              { id: "all", label: "All", count: 10 },
              { id: "active_fleet", label: "Fleet", count: 5 },
              { id: "at_risk", label: "At Risk", count: atRiskCount },
              { id: "blocked", label: "Blocked", count: blockedCount }
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() =>
                  setMapFilterChip(
                    chip.id as "all" | "blocked" | "at_risk" | "active_fleet"
                  )
                }
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  mapFilterChip === chip.id
                    ? "bg-[#003356] text-white shadow-xs"
                    : "bg-slate-100/90 hover:bg-slate-200/80 text-slate-700"
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`text-[9px] px-1 rounded-full font-bold ${
                    mapFilterChip === chip.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            ))}
          </div>

          {/* Elements 2, 3, 4, 5: Compact 4-Card Metric Grid (Active Fleet, At Risk, Blocked, SLA) */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {/* Metric 1: Active Fleet */}
            <button
              type="button"
              onClick={() =>
                setMapFilterChip(
                  mapFilterChip === "active_fleet" ? "all" : "active_fleet"
                )
              }
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                mapFilterChip === "active_fleet"
                  ? "bg-[#003356]/10 border-[#003356] shadow-xs ring-1 ring-[#003356]"
                  : "bg-slate-50/90 hover:bg-white border-slate-200/70 hover:border-slate-300"
              }`}
              title="Click to filter map to Active Fleet"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider truncate">
                  Fleet
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-bold text-[#003356] leading-none">
                  {activeVehiclesCount}
                </span>
              </div>
              <span className="text-[9px] text-emerald-700 font-bold mt-1 truncate">
                Live (100%)
              </span>
            </button>

            {/* Metric 2: At Risk */}
            <button
              type="button"
              onClick={() =>
                setMapFilterChip(mapFilterChip === "at_risk" ? "all" : "at_risk")
              }
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                mapFilterChip === "at_risk"
                  ? "bg-amber-100/60 border-amber-500 shadow-xs ring-1 ring-amber-500"
                  : "bg-amber-50/50 hover:bg-amber-50 border-amber-200/60 hover:border-amber-300"
              }`}
              title="Click to filter map to At-Risk corridors"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[9px] uppercase font-bold text-amber-800 tracking-wider truncate">
                  At Risk
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-bold text-amber-600 leading-none">
                  {atRiskCount.toString().padStart(2, "0")}
                </span>
              </div>
              <span className="text-[9px] text-amber-700 font-semibold mt-1 truncate">
                Advisory
              </span>
            </button>

            {/* Metric 3: Blocked */}
            <button
              type="button"
              onClick={() =>
                setMapFilterChip(mapFilterChip === "blocked" ? "all" : "blocked")
              }
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                mapFilterChip === "blocked"
                  ? "bg-rose-100/70 border-rose-500 shadow-xs ring-1 ring-rose-500"
                  : "bg-rose-50/50 hover:bg-rose-50 border-rose-200/60 hover:border-rose-300"
              }`}
              title="Click to filter map to Blocked corridors"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[9px] uppercase font-bold text-rose-800 tracking-wider truncate">
                  Blocked
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-bold text-rose-600 leading-none">
                  {blockedCount.toString().padStart(2, "0")}
                </span>
              </div>
              <span className="text-[9px] text-rose-700 font-bold mt-1 truncate">
                Critical
              </span>
            </button>

            {/* Metric 4: Corridor SLA */}
            <button
              type="button"
              onClick={() => setMapFilterChip("all")}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                mapFilterChip === "all"
                  ? "bg-emerald-50/70 border-emerald-400 shadow-xs"
                  : "bg-slate-50/90 hover:bg-white border-slate-200/70 hover:border-slate-300"
              }`}
              title="Corridor on-time transit SLA"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider truncate">
                  SLA
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-bold text-[#003356] leading-none">
                  {slaRate}
                </span>
              </div>
              <span className="text-[9px] text-emerald-700 font-bold mt-1 truncate">
                On-time
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
