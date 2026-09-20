import React, { useState } from "react";
import { useIncidentStore } from "@/stores/incidentStore";
import { useAlertStore } from "@/stores/alertStore";
import { useUiStore } from "@/stores/uiStore";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";

export const IncidentsAlertsPage: React.FC<{ initialTab?: "incidents" | "alerts" }> = ({
  initialTab = "incidents"
}) => {
  const [activeTab, setActiveTab] = useState<"incidents" | "alerts">(initialTab);
  const [alertFilter, setAlertFilter] = useState<"all" | "weather" | "blockade" | "load_cap">("all");

  const incidents = useIncidentStore((s) => s.incidents);
  const selectedIncidentId = useIncidentStore((s) => s.selectedIncidentId);
  const selectIncident = useIncidentStore((s) => s.selectIncident);

  const alerts = useAlertStore((s) => s.alerts);
  const acknowledgeAlert = useAlertStore((s) => s.acknowledgeAlert);
  const setIsReportModalOpen = useUiStore((s) => s.setIsReportModalOpen);

  const selectedIncident =
    incidents.find((i) => i.id === selectedIncidentId) || incidents[0];

  const filteredAlerts = alerts.filter((a) => {
    if (alertFilter === "all") return true;
    return a.category === alertFilter || a.type.includes(alertFilter);
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1440px] mx-auto pb-12">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#72777f]">
          <span className="inline-block w-2 h-2 rounded-full bg-[#ba1a1a] animate-ping" />
          <span className="font-semibold text-[#003356]">Sector 4</span>
          <span>/</span>
          <span className="sm:hidden text-[#181c20] font-semibold">Feed #4802</span>
          <span className="hidden sm:inline">Arunachal Pradesh & Upper Assam Arterials</span>
          <span className="hidden sm:inline">/</span>
          <span className="hidden sm:inline text-[#181c20] font-semibold">Telemetry Feed #4802</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#003356] tracking-tight">
              <span className="sm:hidden">Incidents & Alerts</span>
              <span className="hidden sm:inline">Incidents & Operational Alerts</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#42474e] max-w-3xl mt-0.5">
              <span className="sm:hidden">Hazard telemetry and ground dispatch reports.</span>
              <span className="hidden sm:inline">Real-time hazard telemetry, arterial corridor disruptions, and multi-agency ground dispatch reports across North Eastern transport gateways.</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => alert("Exporting incident log to CSV...")}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg bg-white border border-[#e5e8ee] hover:bg-[#f8fafc] text-xs font-semibold text-[#181c20] shadow-xs flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] text-[#27638c]">
                file_download
              </span>
              <span className="sm:hidden">Export</span>
              <span className="hidden sm:inline">Export Feed (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="h-9 sm:h-10 px-3.5 sm:px-5 rounded-lg bg-[#003356] hover:bg-[#174a73] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 sm:gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px]">add_alert</span>
              <span className="sm:hidden">+ Report</span>
              <span className="hidden sm:inline">+ Report Incident</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics Bar: 2x2 Grid on Mobile/Tablet */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <KpiCard
          label="Active Incidents"
          value={incidents.length}
          badgeText="Critical"
          badgeVariant="danger"
          subtitle="impacted"
          footerText="Avg response: 14m"
        />
        <KpiCard
          label="Corridor Disruption Alerts"
          value={alerts.length}
          badgeText="Active Watch"
          badgeVariant="info"
          subtitle="across national highways"
          footerText="Weather & load advisories logged"
        />
        <KpiCard
          label="BRO Clearances in Progress"
          value={2}
          badgeText="Field Eng"
          badgeVariant="neutral"
          subtitle="Active earthmover teams"
          footerText="Project Vartak & Sewak deployed"
        />
        <KpiCard
          label="Network Telemetry Sync"
          value="Store & Forward"
          badgeText="Online"
          badgeVariant="success"
          footerIcon="cloud_done"
          footerIconColor="text-[#005148]"
          footerText="42 field transponders synced (100%)"
        />
      </div>

      {/* Main Tabs Control */}
      <div className="flex items-center justify-between bg-white p-1.5 rounded-xl border border-[#e5e8ee] shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("incidents")}
            className={`h-10 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "incidents"
                ? "bg-[#003356] text-white shadow-xs"
                : "text-[#42474e] hover:bg-[#f1f4fa]"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">warning</span>
            <span>Incidents</span>
            <span className="px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold">
              {incidents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("alerts")}
            className={`h-10 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "alerts"
                ? "bg-[#003356] text-white shadow-xs"
                : "text-[#42474e] hover:bg-[#f1f4fa]"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">notifications_active</span>
            <span>Alerts & Advisories</span>
            <span className="px-2 py-0.5 rounded-full bg-[#ebeef4] text-[#181c20] text-[10px] font-semibold">
              {alerts.length}
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-4 pr-3 text-xs text-[#72777f]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" /> High Blockade
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#d97706]" /> Moderate Warning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2e7d32]" /> Clear / Caution
          </span>
        </div>
      </div>

      {/* TAB 1: INCIDENTS VIEW (Master-Detail) */}
      {activeTab === "incidents" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          {/* Manifest List (7 columns) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#003356]">
                Live Incident Manifest ({incidents.length})
              </span>
              <span className="text-[11px] text-[#72777f]">
                Click row to inspect ground telemetrics
              </span>
            </div>

            {incidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              const isHigh = inc.severity === "high";

              return (
                <div
                  key={inc.id}
                  onClick={() => selectIncident(inc.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#cfe4ff]/25 border-[#174a73] shadow-xs"
                      : "bg-white border-[#e5e8ee] hover:bg-[#f8fafc]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isHigh
                            ? "bg-[#ffdad6] text-[#ba1a1a]"
                            : "bg-[#fef3c7] text-[#92400e]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {inc.type === "landslide"
                            ? "landslide"
                            : inc.type === "flood"
                            ? "flood"
                            : "block"}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#181c20]">{inc.title}</span>
                          <StatusBadge
                            type="severity"
                            status={inc.severity}
                            size="sm"
                          />
                        </div>
                        <div className="text-xs text-[#72777f] flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-[15px]">alt_route</span>
                          <span>{inc.corridorName || inc.affectedRoadId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 text-right">
                      <span className="text-xs font-semibold text-[#ba1a1a]">Active</span>
                      <span className="text-[10px] text-[#72777f] font-mono mt-0.5">{inc.id}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-[#42474e] border-t border-[#e5e8ee]/70">
                    <span>Reported by: <strong>{inc.reportedBy}</strong></span>
                    <span className="px-2 py-0.5 rounded bg-[#e6f4ea] text-[#137333] font-semibold">
                      {inc.syncStatus === "pending_sync" ? "Syncing..." : "Verified"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inspection Panel (5 columns) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-[#e5e8ee] p-5 shadow-xs flex flex-col gap-4">
            {selectedIncident ? (
              <>
                <div className="flex items-start justify-between pb-3 border-b border-[#e5e8ee]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#72777f] tracking-wider">
                      Incident Ground Telemetry
                    </span>
                    <h3 className="text-base font-bold text-[#003356] mt-0.5">
                      {selectedIncident.corridorName}
                    </h3>
                    <p className="text-xs text-[#72777f] mt-0.5">{selectedIncident.reportedBy}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold">
                    Active Blockage
                  </span>
                </div>

                {/* Verified Photo Preview */}
                <div className="relative w-full h-48 rounded-lg overflow-hidden bg-[#1e293b] border border-[#e5e8ee]">
                  <img
                    src={selectedIncident.photoUrl}
                    alt="Incident photographic record"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 right-2 p-2 rounded bg-black/70 text-white text-[10px] flex items-center justify-between">
                    <span>Geo-tagged Verification Photo</span>
                    <span className="font-mono">
                      {selectedIncident.lat.toFixed(4)}°N, {selectedIncident.lng.toFixed(4)}°E
                    </span>
                  </div>
                </div>

                {/* Detailed Description */}
                <div className="p-3.5 rounded-lg bg-[#f8fafc] border border-[#e5e8ee] text-xs leading-relaxed text-[#181c20]">
                  <p className="font-semibold mb-1 text-[#003356]">Ground Operations Report:</p>
                  <p>{selectedIncident.description}</p>
                </div>

                {/* Impact Analysis */}
                <div className="p-3 rounded-lg bg-[#fff1f2] border border-[#fecdd3] text-xs text-[#9f1239]">
                  <div className="font-bold flex items-center gap-1.5 mb-0.5">
                    <span className="material-symbols-outlined text-[16px]">priority_high</span>
                    <span>Transit Corridor Impact:</span>
                  </div>
                  <p>{selectedIncident.impact || "Heavy commercial convoys halted. Detours active."}</p>
                </div>

                {/* Dispatch Action CTA */}
                <div className="flex gap-2 pt-2 border-t border-[#e5e8ee] mt-auto">
                  <button
                    type="button"
                    onClick={() => alert(`Dispatching BRO clearing units to ${selectedIncident.corridorName}...`)}
                    className="flex-1 h-10 rounded-lg bg-[#003356] hover:bg-[#174a73] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    Deploy Clearing Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => alert("Broadcasting arterial detour advisory to regional units...")}
                    className="flex-1 h-10 rounded-lg bg-[#f1f4fa] hover:bg-[#dfe3e8] text-[#003356] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Broadcast Detour
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-[#72777f]">
                Select an incident from the manifest to inspect telemetry.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: ALERTS & ADVISORIES VIEW */
        <div className="flex flex-col gap-4">
          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "weather", "blockade", "load_cap"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setAlertFilter(cat)}
                className={`h-9 px-4 rounded-lg text-xs font-semibold transition-all capitalize cursor-pointer ${
                  alertFilter === cat
                    ? "bg-[#003356] text-white shadow-xs"
                    : "bg-white border border-[#e5e8ee] text-[#42474e] hover:bg-[#f1f4fa]"
                }`}
              >
                {cat === "all" ? "All Advisories" : cat.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Alerts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border shadow-xs flex flex-col justify-between gap-3 ${
                  alert.severity === "critical"
                    ? "bg-white border-[#ffdad6]"
                    : alert.severity === "warning"
                    ? "bg-white border-[#fef3c7]"
                    : "bg-white border-[#e5e8ee]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg text-white shrink-0 ${
                      alert.severity === "critical"
                        ? "bg-[#ba1a1a]"
                        : alert.severity === "warning"
                        ? "bg-[#d97706]"
                        : "bg-[#27638c]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {alert.severity === "critical"
                        ? "block"
                        : alert.severity === "warning"
                        ? "warning"
                        : "scale"}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#181c20]">{alert.title}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          alert.severity === "critical"
                            ? "bg-[#ffdad6] text-[#ba1a1a]"
                            : alert.severity === "warning"
                            ? "bg-[#fef3c7] text-[#92400e]"
                            : "bg-[#eff6ff] text-[#1e40af]"
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-[#42474e] mt-1.5 leading-relaxed">{alert.message}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#e5e8ee] text-[11px] text-[#72777f]">
                  <span>Logged via Emergency Telemetry</span>
                  <button
                    type="button"
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="text-xs font-semibold text-[#003356] hover:underline cursor-pointer"
                  >
                    {alert.acknowledged ? "Acknowledged" : "Mark Acknowledged"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
