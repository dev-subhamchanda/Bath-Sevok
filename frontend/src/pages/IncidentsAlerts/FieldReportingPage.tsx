import React, { useState } from "react";
import { useIncidentStore } from "@/stores/incidentStore";
import { useDataProvider } from "@/app/providers/DataProviderContext";
import { useRoadStore } from "@/stores/roadStore";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { LiveCameraCapture } from "@/features/incidents/LiveCameraCapture";
import type { Severity } from "@/types/domain";

export const FieldReportingPage: React.FC = () => {
  const incidents = useIncidentStore((s) => s.incidents);
  const addIncident = useIncidentStore((s) => s.addIncident);
  const roads = useRoadStore((s) => s.roads);
  const { provider } = useDataProvider();

  // Live GPS tracking hook
  const {
    coords,
    readableLocation,
    isSharing,
    permissionStatus,
    errorMessage: gpsError,
    toggleLiveSharing,
    applyPresetLocation,
    presets
  } = useLiveLocation(true);

  const [type, setType] = useState<
    "flood" | "landslide" | "road_blocked" | "accident" | "bridge_damage"
  >("flood");
  const [severity, setSeverity] = useState<Severity>("high");
  const [affectedRoadId, setAffectedRoadId] = useState("NH-6");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Live Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const selectedRoad = roads.find((r) => r.id === affectedRoadId);
      const inc = await provider.submitIncident({
        title,
        type,
        severity,
        affectedRoadId,
        corridorName: selectedRoad?.name || affectedRoadId,
        description,
        lat: coords.lat,
        lng: coords.lng,
        photoUrl:
          photoPreview ||
          "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
        reportedBy: "Field Officer (Transit Mobile Terminal)",
        agency: "NER Ground Disaster Unit",
        impact: `Live field report at ${readableLocation}. GPS accuracy ±${coords.accuracy}m.`
      });

      // Synchronize immediately with local domain store (architecture.md §3)
      addIncident(inc);

      setSuccessNotice(
        `Report ${inc.id} submitted! Status: ${
          inc.syncStatus === "pending_sync"
            ? "Stored locally (Pending Sync — backend unreachable)"
            : "Synced with Regional Command Center"
        }`
      );
      setTimeout(() => setSuccessNotice(null), 5000);
      setTitle("");
      setDescription("");
      setPhotoPreview(null);
      setIsCameraActive(false);
    } catch (e: unknown) {
      console.error("Field reporting submission error:", e);
      const msg = e instanceof Error ? e.message : "Failed to submit field incident report";
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 6000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#cfe4ff] text-[#001d34] text-[11px] font-bold uppercase tracking-wider">
            Field Unit Terminal
          </span>
          <span className="text-xs text-[#72777f]">Emergency In-Field Ground Reporting (FR-13 to FR-15)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#003356] tracking-tight">
          Field Incident & Terrain Dispatch Form
        </h1>
        <p className="text-xs sm:text-sm text-[#42474e]">
          Designed for field officers and border patrol units across mountain routes. Live camera capture and continuous GPS location sharing active.
        </p>
      </div>

      {successNotice && (
        <div className="p-4 rounded-xl bg-[#e6f4ea] border border-[#34a853]/40 text-[#137333] text-xs font-semibold flex items-center gap-2 shadow-xs">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span>{successNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#93000a] text-xs font-semibold flex items-center gap-2 shadow-xs">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>Submission Error: {errorMessage}</span>
        </div>
      )}

      {/* Main Submission Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 sm:p-8 rounded-2xl border border-[#e5e8ee] shadow-md flex flex-col gap-5"
      >
        {/* ================= LIVE GPS LOCATION SHARING STRIP ================= */}
        <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                {isSharing && permissionStatus === "granted" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    isSharing && permissionStatus === "granted" ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <div>
                <span className="text-xs font-bold text-[#003356]">
                  Live Location Sharing (GPS)
                </span>
                {isSharing && permissionStatus === "granted" ? (
                  <span className="ml-2 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    ● Streaming Live Coordinates
                  </span>
                ) : (
                  <span className="ml-2 text-[10px] font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                    Paused
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={toggleLiveSharing}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                isSharing
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-white hover:bg-slate-100 text-[#003356] border border-[#cbd5e1]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isSharing ? "my_location" : "location_disabled"}
              </span>
              <span>{isSharing ? "Sharing Active" : "Share Live Location"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#e2e8f0]">
            <div>
              <span className="text-[11px] font-semibold text-[#72777f] block">GPS Telemetry</span>
              <span className="text-xs font-mono font-bold text-[#003356]">
                {coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°E
                <span className="text-[10px] text-[#72777f] font-sans font-normal ml-1">
                  (±{coords.accuracy}m accuracy)
                </span>
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#72777f] block">Sector Recognition</span>
              <span className="text-xs font-medium text-[#005148] truncate block" title={readableLocation}>
                {readableLocation}
              </span>
            </div>
          </div>

          {gpsError && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="material-symbols-outlined text-[16px] text-amber-600">warning</span>
                <span>{gpsError}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <span className="text-[10px] text-slate-600">Select Known Corridor:</span>
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      applyPresetLocation(p);
                      if (p.corridor.includes("NH-6")) setAffectedRoadId("NH-6");
                      else if (p.corridor.includes("NH-13")) setAffectedRoadId("NH-13");
                      else if (p.corridor.includes("NH-27")) setAffectedRoadId("NH-27");
                      else if (p.corridor.includes("NH-29")) setAffectedRoadId("NH-29");
                      else if (p.corridor.includes("NH-10")) setAffectedRoadId("NH-10");
                    }}
                    className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 border border-amber-300 text-[10px] font-semibold text-[#003356] transition-colors cursor-pointer"
                  >
                    {p.name.split(" ")[0]} ({p.corridor.split(" ")[0]})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category & Severity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#181c20]">Incident Category</label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as "flood" | "landslide" | "road_blocked" | "accident" | "bridge_damage")
              }
              className="h-10 px-3 rounded-xl bg-[#f8fafc] text-xs text-[#181c20] border border-[#cbd5e1] focus:outline-none"
            >
              <option value="flood">Flash Flooding / Inundation</option>
              <option value="landslide">Hillside Landslide / Mudflow</option>
              <option value="road_blocked">Physical Highway Blockade</option>
              <option value="bridge_damage">Culvert / Bridge Damage</option>
              <option value="accident">Heavy Commercial Collision</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#181c20]">Severity Level</label>
            <div className="grid grid-cols-3 gap-1 h-10 p-1 bg-[#f8fafc] rounded-xl border border-[#cbd5e1]">
              {(["low", "medium", "high"] as Severity[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSeverity(lvl)}
                  className={`text-xs font-semibold rounded-lg capitalize transition-all ${
                    severity === lvl
                      ? lvl === "high"
                        ? "bg-[#ba1a1a] text-white shadow-xs"
                        : lvl === "medium"
                        ? "bg-[#d97706] text-white shadow-xs"
                        : "bg-[#005148] text-white shadow-xs"
                      : "text-[#72777f] hover:text-[#181c20]"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Affected Highway Corridor */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#181c20]">Affected Highway Corridor</label>
          <select
            value={affectedRoadId}
            onChange={(e) => setAffectedRoadId(e.target.value)}
            className="h-10 px-3 rounded-xl bg-[#f8fafc] text-xs text-[#181c20] border border-[#cbd5e1] focus:outline-none"
          >
            {roads.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#181c20]">Brief Headline</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Culvert overflow KM 32 Nongpoh sector"
            className="h-10 px-3 rounded-xl bg-[#f8fafc] text-xs text-[#181c20] border border-[#cbd5e1] focus:outline-none"
          />
        </div>

        {/* Ground Report */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#181c20]">Ground Situation Report</label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide current clearance status, estimated clearing time, water depth or stranded truck details..."
            className="p-3 rounded-xl bg-[#f8fafc] text-xs text-[#181c20] border border-[#cbd5e1] focus:outline-none resize-none"
          />
        </div>

        {/* ================= LIVE PHOTO VIA CAMERA ================= */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#181c20]">
            Photographic Proof (Live Field Camera)
          </label>
          {isCameraActive ? (
            <LiveCameraCapture
              readableLocation={readableLocation}
              coords={{ lat: coords.lat, lng: coords.lng }}
              onCapture={(img) => {
                setPhotoPreview(img);
                setIsCameraActive(false);
              }}
              onCancel={() => setIsCameraActive(false)}
            />
          ) : photoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-[#cbd5e1] bg-slate-900 flex flex-col">
              <img
                src={photoPreview}
                alt="Captured live field evidence"
                className="w-full h-48 object-cover"
              />
              <div className="p-3 bg-white border-t border-[#e2e8f0] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Live Photo Attached</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(true)}
                    className="px-3 py-1 rounded-lg bg-[#f1f4fa] hover:bg-[#e2e8f0] text-xs font-semibold text-[#003356] transition-colors cursor-pointer"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="px-2 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-xl border-2 border-dashed border-[#cbd5e1] hover:border-[#174a73] bg-[#f8fafc] flex flex-col items-center justify-center text-center gap-2 transition-colors">
              <div className="w-12 h-12 rounded-full bg-[#e0f2fe] text-[#003356] flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">photo_camera</span>
              </div>
              <span className="text-xs font-bold text-[#181c20]">
                Capture Field Evidence Directly
              </span>
              <button
                type="button"
                onClick={() => setIsCameraActive(true)}
                className="px-4 py-2 rounded-xl bg-[#003356] hover:bg-[#174a73] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                <span>Live Photo</span>
              </button>
            </div>
          )}
        </div>

        {/* Offline Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
          <div>
            <div className="text-xs font-semibold text-[#181c20]">Offline Simulation (FR-14)</div>
            <div className="text-[11px] text-[#72777f]">
              Enables simulated store-and-forward pending sync behavior
            </div>
          </div>
          <input
            type="checkbox"
            checked={isOfflineSimulated}
            onChange={(e) => setIsOfflineSimulated(e.target.checked)}
            className="w-4 h-4 text-[#003356] rounded"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white font-semibold text-xs transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
          <span>{isSubmitting ? "Transmitting Report..." : "Submit to Regional Command Center"}</span>
        </button>
      </form>

      {/* Manifest of Recent Reports */}
      <div className="bg-white p-6 rounded-2xl border border-[#e5e8ee] shadow-sm flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[#003356]">Session Submissions & Sync Status (FR-15)</h2>
        <div className="flex flex-col gap-2">
          {incidents.slice(0, 5).map((inc) => (
            <div
              key={inc.id}
              className="p-3 rounded-xl bg-[#f8fafc] border border-[#e5e8ee] flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-semibold text-[#181c20]">{inc.title}</span>
                <span className="text-[11px] text-[#72777f] ml-2 font-mono">{inc.id}</span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  inc.syncStatus === "pending_sync"
                    ? "bg-[#fef3c7] text-[#92400e]"
                    : "bg-[#e6f4ea] text-[#137333]"
                }`}
              >
                {inc.syncStatus === "pending_sync" ? "Pending Sync (Offline)" : "Synced"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
