import React, { useState } from "react";
import { getApiConfig, setApiConfig, pingBackend, resetApiConfig, type PingResult } from "@/services/apiConfig";
import { useDataProvider } from "@/app/providers/DataProviderContext";
import { liveApiProvider } from "@/services/live/liveApiProvider";

interface BackendConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackendConnectionModal: React.FC<BackendConnectionModalProps> = ({
  isOpen,
  onClose
}) => {
  const { sourceType, setSourceType, triggerReconnect } = useDataProvider();

  const [inputUrl, setInputUrl] = useState(() => getApiConfig().httpUrl);
  const [selectedSource, setSelectedSource] = useState<"mock" | "live">(sourceType);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [offlineCount, setOfflineCount] = useState(() => {
    try {
      const queue = localStorage.getItem("ner_pending_incidents");
      return queue ? JSON.parse(queue).length : 0;
    } catch {
      return 0;
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handlePing = async (urlToTest?: string) => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await pingBackend(urlToTest || inputUrl, 4500);
      setPingResult(res);
    } catch {
      setPingResult({
        reachable: false,
        latencyMs: 0,
        error: "Ping probe execution error"
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handleSave = () => {
    setApiConfig(inputUrl, selectedSource);
    setSourceType(selectedSource);
    triggerReconnect();

    setSaveFeedback("Configuration saved & reconnected!");
    setTimeout(() => {
      setSaveFeedback(null);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    resetApiConfig();
    const config = getApiConfig();
    setInputUrl(config.httpUrl);
    setSelectedSource(config.sourceType);
    setSourceType(config.sourceType);
    triggerReconnect();
    setSaveFeedback("Reset to default environment configuration");
    setTimeout(() => setSaveFeedback(null), 1500);
  };

  const handleFlushQueue = async () => {
    setIsSyncing(true);
    try {
      const count = await liveApiProvider.flushOfflineIncidentQueue();
      setSaveFeedback(`Successfully synced ${count} pending incident report(s)!`);
      const queue = localStorage.getItem("ner_pending_incidents");
      setOfflineCount(queue ? JSON.parse(queue).length : 0);
      setTimeout(() => setSaveFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const presets = [
    { label: "Production Cloud Server (Render)", url: "https://bath-sevok-server-nlbg.onrender.com" },
    { label: "Local Express Backend (3001)", url: "http://localhost:3001" },
    { label: "Local Dev Proxy (Port 3000)", url: "http://localhost:3000" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#e5e8ee] overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#f8fafc] border-b border-[#e5e8ee]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#003356] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]">router</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#003356]">Backend & API Connectivity Manager</h2>
              <p className="text-xs text-[#72777f]">
                Configure target server, verify endpoints & toggle data streaming
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#72777f] hover:text-[#181c20] hover:bg-[#e5e8ee] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5 text-xs text-[#181c20]">
          {saveFeedback && (
            <div className="p-3 rounded-xl bg-[#e6f4ea] border border-[#34a853]/40 text-[#137333] font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{saveFeedback}</span>
            </div>
          )}

          {/* Section 1: Data Provider Mode */}
          <div className="flex flex-col gap-2">
            <label className="font-bold text-[#003356] uppercase tracking-wider text-[11px]">
              Active Data Source Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#f1f4fa] rounded-xl border border-[#e5e8ee]">
              <button
                type="button"
                onClick={() => setSelectedSource("mock")}
                className={`py-2.5 px-3 rounded-lg font-semibold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  selectedSource === "mock"
                    ? "bg-[#003356] text-white shadow-xs"
                    : "text-[#42474e] hover:bg-white/60"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">science</span>
                  <span>Mock Simulation</span>
                </div>
                <span
                  className={`text-[10px] font-normal ${
                    selectedSource === "mock" ? "text-[#cfe4ff]" : "text-[#72777f]"
                  }`}
                >
                  Offline Seed Engine
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSource("live")}
                className={`py-2.5 px-3 rounded-lg font-semibold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  selectedSource === "live"
                    ? "bg-[#005148] text-white shadow-xs"
                    : "text-[#42474e] hover:bg-white/60"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
                  <span>Live Backend API</span>
                </div>
                <span
                  className={`text-[10px] font-normal ${
                    selectedSource === "live" ? "text-[#a3e5dc]" : "text-[#72777f]"
                  }`}
                >
                  REST + WebSocket Stream
                </span>
              </button>
            </div>
          </div>

          {/* Section 2: Backend URL Configuration */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#003356] uppercase tracking-wider text-[11px]">
                Backend Base URL
              </label>
              <span className="text-[10px] text-[#72777f]">HTTP / REST Endpoint</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="http://10.215.235.233:5000"
                className="flex-1 h-10 px-3.5 bg-[#f8fafc] text-[#181c20] font-mono text-xs rounded-xl border border-[#cbd5e1] focus:border-[#003356] focus:bg-white focus:outline-none transition-all"
              />
              <button
                type="button"
                disabled={isPinging || !inputUrl.trim()}
                onClick={() => handlePing()}
                className="h-10 px-4 bg-[#003356] hover:bg-[#174a73] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isPinging ? "autorenew" : "network_check"}
                </span>
                <span>{isPinging ? "Pinging..." : "Ping"}</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-[#72777f] font-medium">Quick Presets:</span>
              {presets.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => {
                    setInputUrl(p.url);
                    handlePing(p.url);
                  }}
                  className="px-2 py-0.5 rounded-md bg-[#f1f4fa] hover:bg-[#e2e8f0] border border-[#cbd5e1] text-[10px] font-semibold text-[#003356] transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Ping Result Feedback */}
            {pingResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                  pingResult.reachable
                    ? "bg-[#e6f4ea] border-[#34a853]/40 text-[#137333]"
                    : "bg-[#ffdad6] border-[#ba1a1a]/30 text-[#93000a]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                  {pingResult.reachable ? "check_circle" : "cancel"}
                </span>
                <div className="flex flex-col gap-0.5">
                  <div className="font-bold flex items-center gap-2">
                    <span>
                      {pingResult.reachable ? "Backend Host Reachable!" : "Backend Host Unreachable"}
                    </span>
                    {pingResult.reachable && (
                      <span className="px-1.5 py-0.2 rounded bg-white/70 text-[10px] font-mono">
                        {pingResult.latencyMs}ms latency
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {pingResult.reachable
                      ? `Server responded with HTTP status ${pingResult.status || 200} on ${pingResult.endpointTested}. Ready for REST data dispatch.`
                      : pingResult.error}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Offline Queue & Sync Status */}
          {offlineCount > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-700 text-[18px]">
                  cloud_off
                </span>
                <div>
                  <div className="font-bold text-xs">{offlineCount} Offline Reports Pending</div>
                  <span className="text-[10px] text-amber-800">
                    Recorded during field transit with pending backend sync.
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleFlushQueue}
                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-[11px] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isSyncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          )}

          {/* Realtime WebSocket Stream Info */}
          <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#003356] text-[18px]">
                sync_alt
              </span>
              <div>
                <span className="font-semibold text-[11px] text-[#003356] block">
                  Realtime WebSocket Stream
                </span>
                <span className="text-[10px] text-[#72777f] font-mono truncate max-w-[280px] block">
                  {liveApiProvider.getWsUrl()}
                </span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                selectedSource === "mock"
                  ? "bg-slate-100 text-slate-600"
                  : liveApiProvider.getWsStatus() === "connected"
                  ? "bg-emerald-100 text-emerald-800"
                  : liveApiProvider.getWsStatus() === "connecting"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {selectedSource === "mock" ? "Mock Active" : liveApiProvider.getWsStatus()}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#e5e8ee] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 text-xs font-semibold text-[#72777f] hover:text-[#181c20] hover:bg-[#e2e8f0] rounded-lg transition-colors cursor-pointer"
          >
            Reset to .env Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#42474e] hover:bg-[#e5e8ee] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-[#003356] hover:bg-[#174a73] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>Apply & Reconnect</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
