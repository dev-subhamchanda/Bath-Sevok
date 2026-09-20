import React, { useState } from "react";
import { useUiStore } from "@/stores/uiStore";
import { useDataProvider } from "@/app/providers/DataProviderContext";
import { useRoadStore } from "@/stores/roadStore";
import { useIncidentStore } from "@/stores/incidentStore";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { LiveCameraCapture } from "./LiveCameraCapture";
import type { Severity, Incident } from "@/types/domain";

export const ReportIncidentModal: React.FC = () => {
  const isOpen = useUiStore((s) => s.isReportModalOpen);
  const setIsOpen = useUiStore((s) => s.setIsReportModalOpen);
  const { provider } = useDataProvider();
  const roads = useRoadStore((s) => s.roads);
  const addIncident = useIncidentStore((s) => s.addIncident);

  // Live GPS hook with automatic initial request and continuous watchPosition capability
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

  const [type, setType] = useState<Incident["type"]>("landslide");
  const [severity, setSeverity] = useState<Severity>("high");
  const [affectedRoadId, setAffectedRoadId] = useState("NH-6");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Live Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const selectedRoad = roads.find((r) => r.id === affectedRoadId);

      if (isOfflineSimulated) {
        // Explicitly test offline simulation flow (PRD FR-14)
        const offlineInc: Incident = {
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
          reportedBy: "Field Officer (Offline Field Terminal)",
          agency: "NER Emergency Transit Cell",
          impact: `Carriageway blocked at ${readableLocation}. Queued in pending sync buffer.`,
          id: `INC-OFFLINE-${Date.now().toString().slice(-4)}`,
          createdAt: new Date().toISOString(),
          status: "pending",
          syncStatus: "pending_sync"
        };
        addIncident(offlineInc);
        setIsOpen(false);
        setTitle("");
        setDescription("");
        setPhotoPreview(null);
        setIsCameraActive(false);
        return;
      }

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
        reportedBy: "Field Officer (GPS Verified Ground Unit)",
        agency: "NER Emergency Transit Cell",
        impact: `Carriageway blocked at ${readableLocation}. Live telemetry attached.`
      });

      // Synchronize immediately with local domain store (architecture.md §3)
      addIncident(inc);

      // Close modal on success
      setIsOpen(false);
      setTitle("");
      setDescription("");
      setPhotoPreview(null);
      setIsCameraActive(false);
    } catch (err: unknown) {
      console.error("Submission error:", err);
      const msg = err instanceof Error ? err.message : "Failed to submit incident report";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#e5e8ee] overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#f8fafc] border-b border-[#e5e8ee]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ba1a1a] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]">add_alert</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#003356]">Report Road Incident / Blockade</h2>
              <p className="text-xs text-[#72777f]">
                Live Camera Field Capture & Real-time GPS Location
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-[#72777f] hover:text-[#181c20] hover:bg-[#e5e8ee] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#93000a] text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span>Submission Failed: {errorMessage}</span>
            </div>
          )}

          {/* ================= SECTION 1: LIVE LOCATION SHARING THROUGH GPS ================= */}
          <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col gap-2.5">
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
                    Live GPS Location Sharing
                  </span>
                  {isSharing && permissionStatus === "granted" ? (
                    <span className="ml-2 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      ● Active (Continuous Tracking)
                    </span>
                  ) : (
                    <span className="ml-2 text-[10px] font-medium text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                      Paused
                    </span>
                  )}
                </div>
              </div>

              {/* Clear "Share Live Location" Control */}
              <button
                type="button"
                onClick={toggleLiveSharing}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  isSharing
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-white hover:bg-slate-100 text-[#003356] border border-[#cbd5e1]"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isSharing ? "my_location" : "location_disabled"}
                </span>
                <span>{isSharing ? "Sharing Live Location" : "Share Live Location"}</span>
              </button>
            </div>

            {/* Current Coordinates & Readable Location Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#e2e8f0]">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-[#42474e]">GPS Coordinates</span>
                <span className="text-xs font-mono font-bold text-[#003356]">
                  {coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°E
                  <span className="text-[10px] text-[#72777f] font-sans font-normal ml-1">
                    (±{coords.accuracy}m)
                  </span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-[#42474e]">Recognized Sector</span>
                <span className="text-xs font-medium text-[#005148] truncate" title={readableLocation}>
                  {readableLocation}
                </span>
              </div>
            </div>

            {/* GPS Error & Fallback Presets if Denied/Unavailable */}
            {gpsError && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">info</span>
                  <span>{gpsError}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-600">Quick Corridor Presets:</span>
                  {presets.slice(0, 3).map((p) => (
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

          {/* ================= SECTION 2: LIVE PHOTO VIA DEVICE CAMERA ================= */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#181c20]">
                Incident Photographic Evidence
              </label>
              <span className="text-[11px] text-[#72777f]">Device Camera Verification</span>
            </div>

            {/* Live Camera Viewfinder or Trigger */}
            {isCameraActive ? (
              <LiveCameraCapture
                readableLocation={readableLocation}
                coords={{ lat: coords.lat, lng: coords.lng }}
                onCapture={(imgData) => {
                  setPhotoPreview(imgData);
                  setIsCameraActive(false);
                }}
                onCancel={() => setIsCameraActive(false)}
              />
            ) : photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-[#cbd5e1] bg-slate-900 flex flex-col">
                <img
                  src={photoPreview}
                  alt="Captured live incident evidence"
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
              <div className="p-5 rounded-xl border-2 border-dashed border-[#cbd5e1] hover:border-[#174a73] bg-[#f8fafc] flex flex-col items-center justify-center text-center gap-2.5 transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#e0f2fe] text-[#003356] flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">photo_camera</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#181c20]">
                    Capture Incident Evidence
                  </span>
                  <span className="text-[11px] text-[#72777f]">
                    Uses device camera with real-time GPS telemetry stamp
                  </span>
                </div>
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

          {/* ================= SECTION 3: INCIDENT DETAILS ================= */}
          {/* Incident Type & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#181c20]">Incident Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Incident["type"])}
                className="h-10 px-3 bg-[#f8fafc] text-sm text-[#181c20] rounded-xl border border-[#cbd5e1] focus:border-[#174a73] focus:bg-white focus:outline-none"
              >
                <option value="landslide">Hillside Landslide / Mudflow</option>
                <option value="flood">Flash Flood / Inundation</option>
                <option value="road_blocked">Physical Road Blockade</option>
                <option value="bridge_damage">Bridge / Culvert Damage</option>
                <option value="accident">Commercial Collision</option>
                <option value="traffic">Severe Traffic Gridlock</option>
                <option value="other">Other Mountain Hazard</option>
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

          {/* Affected Corridor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#181c20]">
              Affected Corridor / Highway
            </label>
            <select
              value={affectedRoadId}
              onChange={(e) => setAffectedRoadId(e.target.value)}
              className="h-10 px-3 bg-[#f8fafc] text-sm text-[#181c20] rounded-xl border border-[#cbd5e1] focus:border-[#174a73] focus:bg-white focus:outline-none"
            >
              {roads.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.sector || r.roadType})
                </option>
              ))}
            </select>
          </div>

          {/* Headline */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#181c20]">
              Headline / Incident Summary
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flash flood KM 48 Nongpoh sector across 2 lanes"
              className="h-10 px-3 bg-[#f8fafc] text-sm text-[#181c20] placeholder:text-[#72777f] rounded-xl border border-[#cbd5e1] focus:border-[#174a73] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Detailed Observations */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#181c20]">
              Detailed Ground Observations
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe road blockage extent, water depth, required earthmovers, or stranded convoy lines..."
              className="p-3 bg-[#f8fafc] text-sm text-[#181c20] placeholder:text-[#72777f] rounded-xl border border-[#cbd5e1] focus:border-[#174a73] focus:bg-white focus:outline-none resize-none"
            />
          </div>

          {/* Offline Sync Simulation Toggle (FR-14) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#181c20]">
                Simulate Offline Submission (FR-14)
              </span>
              <span className="text-[11px] text-[#72777f]">
                Tests store-and-forward pending_sync ➔ synced transition
              </span>
            </div>
            <input
              type="checkbox"
              checked={isOfflineSimulated}
              onChange={(e) => setIsOfflineSimulated(e.target.checked)}
              className="w-4 h-4 text-[#003356] rounded"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5e8ee]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-10 px-4 rounded-xl text-sm text-[#42474e] hover:bg-[#f1f4fa] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-6 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white text-sm font-semibold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>{isSubmitting ? "Transmitting..." : "Submit Incident Report"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
