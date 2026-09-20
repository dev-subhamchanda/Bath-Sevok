import { useState, useCallback } from "react";
import { useDataProvider } from "@/app/providers/DataProviderContext";
import { useUiStore } from "@/stores/uiStore";

export function useDemoScenario() {
  const { provider } = useDataProvider();
  const demoStatus = useUiStore((s) => s.demoScenarioStatus);
  const setDemoStatus = useUiStore((s) => s.setDemoScenarioStatus);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4500);
  };

  const runRainfallScenario = useCallback(async () => {
    setDemoStatus("running");
    showToast("Triggering monsoon downpour simulation over Shillong corridor...");

    try {
      await provider.triggerDemoEvent("heavy_rainfall");
      setDemoStatus("flooded");
      showToast("Flood hazard critical on NH-6! Disruption detected. Safer alternate route calculated.");
    } catch (e) {
      console.error("Rainfall scenario failed:", e);
      setDemoStatus("idle");
    }
  }, [provider, setDemoStatus]);

  const resetScenario = useCallback(async () => {
    try {
      await provider.triggerDemoEvent("reset");
      setDemoStatus("idle");
      showToast("Simulation reset to clean baseline state. All corridors restored.");
    } catch (e) {
      console.error("Reset failed:", e);
    }
  }, [provider, setDemoStatus]);

  return {
    demoStatus,
    runRainfallScenario,
    resetScenario,
    toastMessage,
    dismissToast: () => setToastMessage(null)
  };
}
