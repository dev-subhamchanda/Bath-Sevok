import React, { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import type { UserRole } from "@/types/domain";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { BackendConnectionModal } from "@/components/common/BackendConnectionModal";

export const SettingsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const selectProfile = useAuthStore((s) => s.selectProfile);
  const activeRole = useUiStore((s) => s.activeRole);
  const selectedVehicleType = useUiStore((s) => s.selectedVehicleType);

  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);

  // Role and Vehicle profile state
  const [selectedRole, setSelectedRole] = useState<UserRole>(user?.role || activeRole || "operator");
  const [selectedVehicle, setSelectedVehicle] = useState<"heavy" | "four-wheeler" | "two-wheeler">(
    user?.vehicleType || selectedVehicleType || "four-wheeler"
  );

  // Local interactive preferences
  const [offlineSyncEnabled, setOfflineSyncEnabled] = useState(true);
  const [autoRerouteAlerts, setAutoRerouteAlerts] = useState(true);
  const [satelliteTelemetry, setSatelliteTelemetry] = useState(true);
  const [highContrastMap, setHighContrastMap] = useState(false);
  const [landslideThreshold, setLandslideThreshold] = useState(65);
  const [floodThreshold, setFloodThreshold] = useState(70);
  const [telemetryInterval, setTelemetryInterval] = useState("10");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const roles = [
    {
      id: "operator" as UserRole,
      title: "Control Desk Operator",
      badge: "Active Dispatch",
      icon: "headset_mic",
      description: "Manage live corridor telemetry, reroute freight convoys, and handle dispatch operations."
    },
    {
      id: "admin" as UserRole,
      title: "Regional Authority",
      badge: "HQ Command",
      icon: "admin_panel_settings",
      description: "High-level oversight across 8 North East states, corridor clearance orders, and SLA governance."
    },
    {
      id: "officer" as UserRole,
      title: "Field Transit Officer",
      badge: "Transit Post",
      icon: "shield_person",
      description: "On-the-ground checkpoint operations, photo hazard telemetry verification, and incident logging."
    }
  ];

  const vehicles = [
    {
      id: "two-wheeler" as const,
      name: "Two Wheeler",
      badge: "Agile Transit",
      icon: "two_wheeler",
      color: "bg-[#27638c]",
      description: "Specialized for narrow rural hill tracks, steep gradient slope corridors, and express emergency parcel dispatches.",
      specs: "Payload: < 60kg • Max Slope: 28°"
    },
    {
      id: "four-wheeler" as const,
      name: "Four Wheeler (Utility / 4x4)",
      badge: "Standard Fleet",
      icon: "directions_car",
      color: "bg-[#005148]",
      description: "Utility pickups, emergency 4x4 response vehicles, and multi-district transit across regional arteries.",
      specs: "Payload: < 2.5 Tons • All-Weather 4WD"
    },
    {
      id: "heavy" as const,
      name: "Heavy Commercial Freight",
      badge: "Cargo / Convoy",
      icon: "local_shipping",
      color: "bg-[#003356]",
      description: "Multi-axle container trucks, refrigerated pharmaceutical carriers, and essential supply convoys on NH corridors.",
      specs: "Payload: 15-40 Tons • NH Arterials"
    }
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    selectProfile(selectedRole, selectedVehicle);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1440px] mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-6 bg-white rounded-xl border border-[#e5e8ee] shadow-xs">
        <div className="flex flex-col gap-1 max-w-2xl">
          <div className="flex items-center gap-2 text-[#72777f] text-xs uppercase tracking-wider font-semibold">
            <span>NER Logistics Intelligence</span>
            <span>/</span>
            <span className="text-[#003356] font-bold">System Configuration</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#003356] tracking-tight">
            Settings & Operational Preferences
          </h1>
          <p className="text-xs sm:text-sm text-[#42474e]">
            Manage gateway connectivity, satellite telemetry ingestion, automated corridor alerts, and local field device synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <DataSourceBadge />
          <button
            type="button"
            onClick={() => setIsBackendModalOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#f1f4fa] hover:bg-[#e5e8ee] text-[#003356] text-xs font-semibold border border-[#e5e8ee] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">hub</span>
            <span>Configure Backend API</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 transition-all">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
          <span>Configuration preferences updated and applied to local telemetry engine.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Main settings */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* User Profile, Operational Role & Vehicle Configuration */}
          <div className="bg-white p-6 rounded-xl border border-[#e5e8ee] shadow-xs flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#181c20] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#003356] text-[20px]">badge</span>
                <span>Operational Role & Vehicle Configuration</span>
              </h2>
              <span className="text-[11px] text-[#72777f]">
                Active Profile: <strong className="text-[#003356] capitalize">{selectedRole}</strong> • <strong className="text-[#003356] capitalize">{selectedVehicle.replace("-", " ")}</strong>
              </span>
            </div>

            {/* Active User Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-lg bg-[#f7f9ff] border border-[#e5e8ee]/80 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase text-[#72777f] tracking-wider">Logged In Personnel</span>
                <span className="font-bold text-[#181c20]">{user?.name || "Dr. M. Saikia (Senior Dispatcher)"}</span>
                <span className="text-[#72777f] text-[11px]">{user?.email || "dispatcher@ner-logistics.gov.in"}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase text-[#72777f] tracking-wider">Clearance ID & Agency</span>
                <span className="font-semibold text-[#181c20]">{user?.idType || "Govt / Agency ID"}: NER-HQ-8491</span>
                <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Authorized Dispatch & Incident Control
                </span>
              </div>
            </div>

            {/* 1. Operational Command Role Selection */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#003356] uppercase tracking-wider">
                  Operational Command Role
                </span>
                <span className="text-[11px] text-[#72777f]">Select assigned clearance</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {roles.map((r) => {
                  const active = selectedRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        active
                          ? "bg-[#cfe4ff]/25 border-[#174a73] shadow-xs ring-2 ring-[#003356]/20"
                          : "bg-white border-[#e5e8ee] hover:bg-[#f1f4fa] hover:border-[#c2c7cf]"
                      }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            active ? "bg-[#003356] text-white" : "bg-[#f1f4fa] text-[#42474e]"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">{r.icon}</span>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            active ? "bg-[#174a73] text-white" : "bg-[#ebeef4] text-[#42474e]"
                          }`}
                        >
                          {r.badge}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#181c20] leading-tight">{r.title}</div>
                        <p className="text-[10px] text-[#72777f] mt-1 leading-snug">{r.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Vehicle Profile Configuration */}
            <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#003356] uppercase tracking-wider">
                  Assigned Vehicle Profile
                </span>
                <span className="text-[11px] text-[#72777f]">Route clearance & gradient specs</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {vehicles.map((v) => {
                  const active = selectedVehicle === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVehicle(v.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        active
                          ? "bg-[#cfe4ff]/25 border-[#174a73] shadow-xs ring-2 ring-[#003356]/20"
                          : "bg-white border-[#e5e8ee] hover:bg-[#f1f4fa] hover:border-[#c2c7cf]"
                      }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${v.color}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">{v.icon}</span>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            active ? "bg-[#174a73] text-white" : "bg-[#ebeef4] text-[#42474e]"
                          }`}
                        >
                          {v.badge}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#181c20] leading-tight">{v.name}</div>
                        <p className="text-[10px] text-[#72777f] mt-1 leading-snug">{v.description}</p>
                      </div>
                      <div className="text-[9px] font-mono text-[#42474e] pt-1.5 border-t border-slate-100/80 truncate">
                        {v.specs}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Telemetry & GIS Configuration */}
          <div className="bg-white p-6 rounded-xl border border-[#e5e8ee] shadow-xs flex flex-col gap-5">
            <h2 className="text-base font-bold text-[#181c20] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#003356] text-[20px]">satellite_alt</span>
              <span>GIS Telemetry & Corridor Ingestion</span>
            </h2>

            <div className="flex flex-col gap-4 divide-y divide-slate-100">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-xs font-bold text-[#181c20]">Real-time Satellite Telemetry</div>
                  <div className="text-[11px] text-[#72777f]">Stream continuous live GPS coordinates from active convoy vehicles.</div>
                </div>
                <input
                  type="checkbox"
                  checked={satelliteTelemetry}
                  onChange={(e) => setSatelliteTelemetry(e.target.checked)}
                  className="w-5 h-5 accent-[#003356] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <div className="text-xs font-bold text-[#181c20]">Automated Monsoon Rerouting</div>
                  <div className="text-[11px] text-[#72777f]">Compute alternative bypass routes when NH-6 or NH-27 report severe blockage.</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoRerouteAlerts}
                  onChange={(e) => setAutoRerouteAlerts(e.target.checked)}
                  className="w-5 h-5 accent-[#003356] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <div className="text-xs font-bold text-[#181c20]">High Contrast Terrain Mode</div>
                  <div className="text-[11px] text-[#72777f]">Enhance visibility for rugged topographic elevations and contour lines on map.</div>
                </div>
                <input
                  type="checkbox"
                  checked={highContrastMap}
                  onChange={(e) => setHighContrastMap(e.target.checked)}
                  className="w-5 h-5 accent-[#003356] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <div className="text-xs font-bold text-[#181c20]">Offline Store Sync Buffer</div>
                  <div className="text-[11px] text-[#72777f]">Cache pending field incident reports locally during low satellite connectivity.</div>
                </div>
                <input
                  type="checkbox"
                  checked={offlineSyncEnabled}
                  onChange={(e) => setOfflineSyncEnabled(e.target.checked)}
                  className="w-5 h-5 accent-[#003356] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Threshold Sliders */}
          <div className="bg-white p-6 rounded-xl border border-[#e5e8ee] shadow-xs flex flex-col gap-5">
            <h2 className="text-base font-bold text-[#181c20] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#003356] text-[20px]">warning</span>
              <span>Predictive Hazard Sensitivity Thresholds</span>
            </h2>

            <div className="flex flex-col gap-5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#181c20]">Landslide Risk Alert Threshold</span>
                  <span className="font-bold text-[#ba1a1a]">{landslideThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  value={landslideThreshold}
                  onChange={(e) => setLandslideThreshold(Number(e.target.value))}
                  className="w-full accent-[#003356] cursor-pointer"
                />
                <span className="text-[10px] text-[#72777f]">Flag corridors as 'Caution' when geological saturation probability exceeds this value.</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#181c20]">Flash Flood Warning Threshold</span>
                  <span className="font-bold text-[#0284c7]">{floodThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  value={floodThreshold}
                  onChange={(e) => setFloodThreshold(Number(e.target.value))}
                  className="w-full accent-[#003356] cursor-pointer"
                />
                <span className="text-[10px] text-[#72777f]">Auto-notify regional dispatch units when river water basin sensors alert.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 col: System Info & Save */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#e5e8ee] shadow-xs flex flex-col gap-4">
            <h3 className="text-sm font-bold text-[#181c20] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#003356]">dns</span>
              <span>System & Gateway Status</span>
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-[#72777f]">Platform Version</span>
                <span className="font-semibold text-[#181c20]">NER-v2.4.0 (Production)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-[#72777f]">Data Environment</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Demo Data Active
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-[#72777f]">GIS Map Engine</span>
                <span className="font-semibold text-[#181c20]">Leaflet + OpenRouteService</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-[#72777f]">Active Corridors</span>
                <span className="font-semibold text-[#181c20]">8 North-Eastern States</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-[#72777f]">Active Role</span>
                <span className="font-semibold text-[#003356] capitalize">{selectedRole}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-[#72777f]">Vehicle Profile</span>
                <span className="font-semibold text-[#003356] capitalize">{selectedVehicle.replace("-", " ")}</span>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-[#72777f] uppercase mb-1.5">
                Telemetry Refresh Rate
              </label>
              <select
                value={telemetryInterval}
                onChange={(e) => setTelemetryInterval(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[#f1f4fa] text-[#181c20] text-xs font-medium border border-[#e5e8ee] focus:outline-none"
              >
                <option value="5">Every 5 seconds (High Frequency)</option>
                <option value="10">Every 10 seconds (Standard)</option>
                <option value="30">Every 30 seconds (Conserve Bandwidth)</option>
              </select>
            </div>

            <button
              type="submit"
              className="mt-4 w-full h-11 rounded-lg bg-[#003356] hover:bg-[#174a73] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </form>

      {/* Backend Connection Modal */}
      <BackendConnectionModal
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
      />
    </div>
  );
};
