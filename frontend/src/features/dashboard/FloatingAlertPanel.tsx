import React from "react";
import { useAlertStore } from "@/stores/alertStore";
import { useUiStore } from "@/stores/uiStore";

export const FloatingAlertPanel: React.FC = () => {
  const alerts = useAlertStore((s) => s.alerts);
  const isCollapsed = useUiStore((s) => s.isAlertPanelCollapsed);
  const setIsCollapsed = useUiStore((s) => s.setIsAlertPanelCollapsed);

  const activeAlerts = alerts.slice(0, 4);

  return (
    <div
      className="map-floating-element absolute bottom-3 sm:bottom-5 left-3 sm:left-5 z-20 w-[calc(100%-1.5rem)] sm:w-full max-w-xs sm:max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08),0_12px_24px_rgba(0,51,86,0.06)] border border-slate-200/80 overflow-hidden"
      id="alert-panel"
    >
      {/* Panel Header */}
      <div className="px-4 py-3 flex items-center justify-between bg-slate-50/90 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
          </span>
          <span className="text-xs font-bold text-[#003356]">
            <span className="sm:hidden">Priority Alerts</span>
            <span className="hidden sm:inline">Priority Route Alerts</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
            {alerts.length} Active
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          title={isCollapsed ? "Expand Alerts" : "Collapse Alerts"}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isCollapsed ? "expand_less" : "expand_more"}
          </span>
        </button>
      </div>

      {/* Panel Body */}
      {!isCollapsed && (
        <div className="p-3 flex flex-col gap-2 max-h-64 overflow-y-auto">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-xl flex items-start gap-2.5 transition-all ${
                alert.severity === "critical"
                  ? "bg-rose-50/80 border border-rose-200 hover:bg-rose-100/70"
                  : alert.severity === "warning"
                  ? "bg-amber-50/80 border border-amber-200 hover:bg-amber-100/70"
                  : "bg-slate-50 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <div
                className={`p-1.5 rounded-lg text-white shrink-0 shadow-xs ${
                  alert.severity === "critical"
                    ? "bg-rose-600"
                    : alert.severity === "warning"
                    ? "bg-amber-500"
                    : "bg-[#27638c]"
                }`}
              >
                <span className="material-symbols-outlined text-[16px] block">
                  {alert.severity === "critical"
                    ? "block"
                    : alert.severity === "warning"
                    ? "warning"
                    : "scale"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      alert.severity === "critical"
                        ? "text-rose-700"
                        : alert.severity === "warning"
                        ? "text-amber-800"
                        : "text-[#27638c]"
                    }`}
                  >
                    {alert.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Active</span>
                </div>
                <p className="text-xs text-slate-800 font-medium leading-snug">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
