import React, { useState } from "react";
import { useDataProvider } from "@/app/providers/DataProviderContext";
import { BackendConnectionModal } from "./BackendConnectionModal";

export const DataSourceBadge: React.FC = () => {
  const { sourceType } = useDataProvider();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide border transition-all cursor-pointer hover:shadow-xs active:scale-95"
        style={{
          backgroundColor: sourceType === "live" ? "#e6f4ea" : "#f1f4fa",
          borderColor: sourceType === "live" ? "#34a853" : "#c2c7cf",
          color: sourceType === "live" ? "#137333" : "#42474e"
        }}
        title={
          sourceType === "live"
            ? "Connected to Live Telemetry & Spatial API (Click to configure)"
            : "Operating on Synthetic / Mock NER Simulation Data (Click to configure)"
        }
      >
        <span
          className="w-2 h-2 rounded-full animate-pulse shrink-0"
          style={{
            backgroundColor: sourceType === "live" ? "#137333" : "#72777f"
          }}
        />
        <span className="hidden">{sourceType === "live" ? "Live Data" : "Mock Data"}</span>
        <span className="material-symbols-outlined text-[13px] opacity-60">tune</span>
      </button>

      {isModalOpen && (
        <BackendConnectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};
