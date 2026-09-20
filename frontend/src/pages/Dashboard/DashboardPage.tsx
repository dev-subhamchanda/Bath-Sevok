import React from "react";
import { NerGisMap } from "@/features/map/NerGisMap";
import { ArterialMatrixTable } from "@/features/accessibility/ArterialMatrixTable";
import { useUiStore } from "@/stores/uiStore";
import { useDemoScenario } from "@/hooks/useDemoScenario";

export const DashboardPage: React.FC = () => {
  const setIsReportModalOpen = useUiStore((s) => s.setIsReportModalOpen);
  const userGpsLocation = useUiStore((s) => s.userGpsLocation);
  const { demoStatus, runRainfallScenario, resetScenario } = useDemoScenario();

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      {/* Top Command Ribbon & Corridor Overview Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-[#003356] text-white text-[11px] uppercase tracking-wider font-bold shadow-xs">
              Live GIS Grid
            </span>
            <span className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>
                <span className="hidden sm:inline">Telemetry Synced: </span>
                <span className="sm:hidden">Synced: </span>
                <strong className="font-mono text-slate-800">
                  {userGpsLocation
                    ? `${userGpsLocation.lat.toFixed(4)}° N, ${userGpsLocation.lng.toFixed(4)}° E`
                    : "27.2046° N, 93.6053° E"}
                </strong>
              </span>
            </span>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#003356] tracking-tight">
              <span className="sm:hidden">Corridor Cartography</span>
              <span className="hidden sm:inline">Regional Logistics Cartography & Terrain Monitoring</span>
            </h1>
            <span className="text-xs text-slate-500 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200/60 font-medium">
              <span className="sm:hidden">Zone VII (8 States)</span>
              <span className="hidden sm:inline">Zone VII — Assam, Meghalaya, Arunachal, Nagaland, Manipur, Mizoram, Tripura, Sikkim</span>
            </span>
          </div>
        </div>

        {/* Quick Action Ribbon */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <span className="material-symbols-outlined text-[#27638c] text-[18px]">
              satellite_alt
            </span>
            <span className="text-xs font-semibold text-slate-800">
              <span className="sm:hidden">INSAT-3DR Active</span>
              <span className="hidden sm:inline">INSAT-3DR Synoptic Active</span>
            </span>
          </div>

          {demoStatus === "idle" ? (
            <button
              type="button"
              onClick={runRainfallScenario}
              className="h-9 sm:h-10 px-3 sm:px-4 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 text-amber-800 font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] text-amber-600">rainy</span>
              <span className="sm:hidden">Simulate Rain</span>
              <span className="hidden sm:inline">Simulate Heavy Rainfall</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={resetScenario}
              className="h-9 sm:h-10 px-3 sm:px-4 bg-sky-50 hover:bg-sky-100 border border-sky-300/80 text-sky-800 font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] text-sky-600">restart_alt</span>
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="h-9 sm:h-10 px-3 sm:px-4 bg-[#003356] text-white hover:bg-[#174a73] font-semibold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 sm:gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px] sm:text-[18px]">emergency_share</span>
            <span className="sm:hidden">SitRep</span>
            <span className="hidden sm:inline">Dispatch SitRep</span>
          </button>
        </div>
      </div>

      {/* Primary Map Viewport with Google Maps Clarity & Subtle Hover Elevation */}
      <NerGisMap />

      {/* Priority Arterial Status Matrix Table */}
      <ArterialMatrixTable />
    </div>
  );
};

export const CommandCenterPage = DashboardPage;
