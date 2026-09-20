import React, { useState, useEffect, useRef, useCallback } from "react";

interface LiveCameraCaptureProps {
  onCapture: (photoDataUrl: string) => void;
  onCancel: () => void;
  readableLocation?: string;
  coords?: { lat: number; lng: number };
}

export const LiveCameraCapture: React.FC<LiveCameraCaptureProps> = ({
  onCapture,
  onCancel,
  readableLocation,
  coords
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<"initializing" | "streaming" | "captured" | "error">(
    "initializing"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isShutterActive, setIsShutterActive] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  // Stop active camera stream tracks
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize camera stream inside effect
  useEffect(() => {
    let active = true;

    async function initCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (active) {
          setErrorMessage("Camera API not supported on this browser or environment");
          setCameraState("error");
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState("streaming");
      } catch (err: unknown) {
        if (!active) return;
        console.warn("Camera access failed:", err);
        const e = err as Error;
        let msg = "Could not activate camera device.";
        if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          msg = "Camera permission was denied. Please allow camera access in browser settings.";
        } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
          msg = "No hardware camera detected on this device.";
        } else if (e.name === "NotReadableError") {
          msg = "Camera hardware is currently in use by another application.";
        }
        setErrorMessage(msg);
        setCameraState("error");
      }
    }

    initCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode, sessionKey]);

  // Capture frame to canvas
  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    setIsShutterActive(true);

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw realistic telemetry stamp overlay on photo
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, canvas.height - 44, canvas.width, 44);

    ctx.fillStyle = "#34d399";
    ctx.font = "bold 15px monospace";
    ctx.fillText("● NER-DISASTER-OPS GROUND TELEMETRY", 18, canvas.height - 24);

    ctx.fillStyle = "#ffffff";
    ctx.font = "13px monospace";
    const locText = readableLocation
      ? `${readableLocation} | ${timestamp}`
      : coords
      ? `${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E | ${timestamp}`
      : `NER Zone VII | ${timestamp}`;
    ctx.fillText(locText, 18, canvas.height - 8);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    setCapturedImage(dataUrl);
    setCameraState("captured");
    stopTracks();

    setTimeout(() => setIsShutterActive(false), 200);
  };

  // Fallback simulated snapshot for environments without camera
  const handleSimulateSnapshot = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background gradient mimicking terrain
    const grad = ctx.createLinearGradient(0, 0, 960, 540);
    grad.addColorStop(0, "#334155");
    grad.addColorStop(0.5, "#475569");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 960, 540);

    // Road terrain sketch
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(380, 540);
    ctx.lineTo(460, 260);
    ctx.lineTo(500, 260);
    ctx.lineTo(580, 540);
    ctx.closePath();
    ctx.fill();

    // Inundation / Mud hazard mark
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.ellipse(470, 380, 110, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("⚠️ HAZARD EVIDENCE (LIVE FIELD CAPTURE)", 40, 60);

    // Timestamp & GPS overlay
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 540 - 44, 960, 44);

    ctx.fillStyle = "#34d399";
    ctx.font = "bold 14px monospace";
    ctx.fillText("● NER DISASTER CELL TRANSIT TELEMETRY", 20, 540 - 24);

    ctx.fillStyle = "#ffffff";
    ctx.font = "13px monospace";
    const locText = readableLocation
      ? `${readableLocation} | ${timestamp}`
      : coords
      ? `${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E | ${timestamp}`
      : `NH-6 KM 48 Nongpoh | ${timestamp}`;
    ctx.fillText(locText, 20, 540 - 8);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    setCapturedImage(dataUrl);
    setCameraState("captured");
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCameraState("initializing");
    setSessionKey((k) => k + 1);
  };

  const handleUsePhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      stopTracks();
    }
  };

  const handleToggleFacingMode = () => {
    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
  };

  return (
    <div className="relative flex flex-col rounded-xl overflow-hidden bg-[#0f172a] text-white border border-[#334155] shadow-xl">
      {/* Viewport Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1e293b]/90 border-b border-[#334155] text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                cameraState === "streaming" ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                cameraState === "streaming" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
          <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
            {cameraState === "captured"
              ? "Live Photo Captured"
              : cameraState === "streaming"
              ? "Live Camera Viewfinder"
              : "Camera Stream"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {cameraState === "streaming" && (
            <button
              type="button"
              onClick={handleToggleFacingMode}
              title="Switch Camera (Front / Rear)"
              className="p-1 rounded hover:bg-[#334155] text-slate-300 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">flip_camera_ios</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              stopTracks();
              onCancel();
            }}
            className="p-1 rounded hover:bg-[#334155] text-slate-300 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      {/* Main Viewfinder / Canvas Area */}
      <div className="relative w-full h-64 sm:h-72 bg-black flex items-center justify-center overflow-hidden">
        {/* White flash on shutter click */}
        {isShutterActive && (
          <div className="absolute inset-0 z-30 bg-white opacity-75 pointer-events-none transition-opacity duration-150" />
        )}

        {/* Video stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            cameraState === "streaming" ? "opacity-100" : "opacity-0 absolute"
          }`}
        />

        {/* Captured image display */}
        {cameraState === "captured" && capturedImage && (
          <img
            src={capturedImage}
            alt="Captured incident proof"
            className="w-full h-full object-cover"
          />
        )}

        {/* Initializing Spinner */}
        {cameraState === "initializing" && (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
            <span className="text-xs">Requesting camera access...</span>
          </div>
        )}

        {/* Error Fallback Box */}
        {cameraState === "error" && (
          <div className="flex flex-col items-center text-center p-4 max-w-sm gap-2">
            <div className="p-2 rounded-full bg-rose-500/20 text-rose-400">
              <span className="material-symbols-outlined text-2xl">videocam_off</span>
            </div>
            <p className="text-xs font-semibold text-rose-300">{errorMessage}</p>
            <p className="text-[11px] text-slate-400">
              You can test the photo evidence workflow using a simulated live telemetry snapshot.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setCameraState("initializing");
                  setSessionKey((k) => k + 1);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#334155] hover:bg-[#475569] text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Retry Camera
              </button>
              <button
                type="button"
                onClick={handleSimulateSnapshot}
                className="px-3 py-1.5 rounded-lg bg-[#005148] hover:bg-[#003832] text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                <span>Simulate Live Snap</span>
              </button>
            </div>
          </div>
        )}

        {/* Viewfinder Target Framing Overlay (Only in streaming mode) */}
        {cameraState === "streaming" && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
            {/* Top info badge */}
            <div className="flex justify-between items-start">
              <div className="px-2 py-1 rounded bg-black/60 backdrop-blur-xs border border-white/10 text-[10px] text-emerald-400 font-mono">
                {readableLocation || "NER DISASTER MONITORING CELL"}
              </div>
              <div className="px-2 py-1 rounded bg-black/60 backdrop-blur-xs border border-white/10 text-[10px] text-slate-300 font-mono">
                REC [1080p]
              </div>
            </div>

            {/* Center target brackets */}
            <div className="self-center w-36 h-28 border border-white/30 rounded-lg flex items-center justify-center relative">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
              <span className="text-[10px] text-white/50 font-mono uppercase tracking-widest">
                Target Hazard
              </span>
            </div>

            {/* Bottom coordinate readout */}
            <div className="text-[10px] text-slate-300 font-mono bg-black/60 backdrop-blur-xs px-2 py-1 rounded self-start border border-white/10">
              {coords ? `${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E` : "GPS Locked"}
            </div>
          </div>
        )}
      </div>

      {/* Viewport Controls / Actions */}
      <div className="px-4 py-3 bg-[#1e293b] border-t border-[#334155] flex items-center justify-between gap-3">
        {cameraState === "streaming" && (
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => {
                stopTracks();
                onCancel();
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* Shutter Button */}
            <button
              type="button"
              onClick={handleTakeSnapshot}
              className="group relative flex items-center justify-center w-14 h-14 rounded-full border-4 border-white/80 hover:border-white transition-all active:scale-95 cursor-pointer shadow-lg"
              title="Capture Live Photo"
            >
              <span className="w-10 h-10 rounded-full bg-rose-600 group-hover:bg-rose-500 transition-colors shadow-inner" />
            </button>

            <button
              type="button"
              onClick={handleSimulateSnapshot}
              title="Test snapshot without camera"
              className="text-[11px] text-slate-400 hover:text-teal-300 transition-colors cursor-pointer"
            >
              Simulate
            </button>
          </div>
        )}

        {cameraState === "captured" && (
          <div className="flex items-center justify-between w-full gap-2">
            <button
              type="button"
              onClick={handleRetake}
              className="h-9 px-4 rounded-lg bg-[#334155] hover:bg-[#475569] text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Retake</span>
            </button>

            <button
              type="button"
              onClick={handleUsePhoto}
              className="h-9 px-5 rounded-lg bg-[#005148] hover:bg-[#003832] text-xs font-semibold text-white shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Use Photo</span>
            </button>
          </div>
        )}

        {cameraState === "error" && (
          <div className="flex items-center justify-end w-full">
            <button
              type="button"
              onClick={onCancel}
              className="h-8 px-3 rounded text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
