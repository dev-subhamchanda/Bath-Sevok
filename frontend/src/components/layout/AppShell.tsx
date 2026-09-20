import React from "react";
import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { ReportIncidentModal } from "@/features/incidents/ReportIncidentModal";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";
import { useDemoScenario } from "@/hooks/useDemoScenario";
import { useUiStore } from "@/stores/uiStore";

export const AppShell: React.FC = () => {
  // Activate live updates stream
  const { error, retry } = useLiveUpdates();
  const { toastMessage, dismissToast } = useDemoScenario();
  const setIsReportModalOpen = useUiStore((s) => s.setIsReportModalOpen);
  const isSidebarCollapsed = useUiStore((s) => s.isSidebarCollapsed);

  return (
    <div className="min-h-screen bg-[#f7f9ff] text-[#181c20] flex flex-col">
      {/* Fixed Top Navigation Bar */}
      <TopNav />

      {/* Fixed Sidebar (Hidden on Mobile, Visible on Tablet & Desktop) */}
      <Sidebar />

      {/* Report Incident Modal */}
      <ReportIncidentModal />

      {/* Main Content Area: Zero offset when collapsed or on Mobile, Offsets on Tablet/Desktop when open */}
      <div
        className={`w-full transition-[padding] duration-300 ease-in-out ${
          isSidebarCollapsed
            ? "pl-0"
            : "pl-0 md:pl-[260px] lg:pl-[280px] xl:pl-[300px]"
        }`}
      >
        <main className="min-h-screen w-full px-3 sm:px-6 xl:px-8 pt-20 sm:pt-24 pb-28 md:pb-12">
          {/* Connection Error or Stale State Banner (rules.md §3) */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#93000a] text-xs font-semibold flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">wifi_off</span>
                <span>Connection Stale: {error}. Operating on cached local simulation state.</span>
              </div>
              <button
                type="button"
                onClick={retry}
                className="px-3 py-1 bg-[#ba1a1a] text-white rounded-md text-[11px] font-bold hover:bg-[#93000a] transition-colors cursor-pointer shrink-0"
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Transient Scenario Toast */}
          {toastMessage && (
            <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md p-4 rounded-xl bg-[#003356] text-white shadow-2xl border border-[#cfe4ff]/20 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#77d7c8] shrink-0">
                  info
                </span>
                <span className="text-xs leading-relaxed font-medium">{toastMessage}</span>
              </div>
              <button
                type="button"
                onClick={dismissToast}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          <Outlet />
        </main>
      </div>

      {/* Mobile Floating 'Report Incident' Button (Stitch Mobile pattern) */}
      <div className="fixed bottom-20 right-4 z-40 md:hidden">
        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ba1a1a] text-white rounded-full shadow-[0_8px_20px_rgba(186,26,26,0.35)] hover:bg-[#93000a] active:scale-95 transition-all cursor-pointer"
          aria-label="Report Incident"
        >
          <span className="material-symbols-outlined text-[20px]">add_alert</span>
          <span className="text-xs font-bold uppercase tracking-wide">Report Incident</span>
        </button>
      </div>

      {/* Fixed Bottom Navigation Bar on Mobile */}
      <BottomNav />
    </div>
  );
};

