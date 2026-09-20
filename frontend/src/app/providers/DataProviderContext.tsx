/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import type { DataProvider } from "@/services/dataProvider";
import { mockDataProvider } from "@/services/mock/mockDataProvider";
import { liveApiProvider } from "@/services/live/liveApiProvider";
import { getApiConfig, setApiConfig } from "@/services/apiConfig";

interface DataProviderContextValue {
  provider: DataProvider;
  sourceType: "mock" | "live";
  setSourceType: (type: "mock" | "live") => void;
  reconnectKey: number;
  triggerReconnect: () => void;
}

const DataProviderContext = createContext<DataProviderContextValue | null>(null);

export const DataProviderContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [sourceType, setSourceTypeState] = useState<"mock" | "live">(() => {
    return getApiConfig().sourceType;
  });

  const [reconnectKey, setReconnectKey] = useState(0);

  // Sync state when external config event occurs
  useEffect(() => {
    const handleConfigChange = () => {
      const current = getApiConfig();
      setSourceTypeState(current.sourceType);
    };

    window.addEventListener("ner:apiConfigChanged", handleConfigChange);
    return () => {
      window.removeEventListener("ner:apiConfigChanged", handleConfigChange);
    };
  }, []);

  const setSourceType = useCallback((type: "mock" | "live") => {
    setSourceTypeState(type);
    setApiConfig(undefined, type);
    setReconnectKey((k) => k + 1);
  }, []);

  const triggerReconnect = useCallback(() => {
    setReconnectKey((k) => k + 1);
  }, []);

  const provider = useMemo<DataProvider>(() => {
    return sourceType === "live" ? liveApiProvider : mockDataProvider;
  }, [sourceType]);

  return (
    <DataProviderContext.Provider
      value={{
        provider,
        sourceType,
        setSourceType,
        reconnectKey,
        triggerReconnect
      }}
    >
      {children}
    </DataProviderContext.Provider>
  );
};

export const useDataProvider = (): DataProviderContextValue => {
  const context = useContext(DataProviderContext);
  if (!context) {
    throw new Error("useDataProvider must be used within a DataProviderContextProvider");
  }
  return context;
};
