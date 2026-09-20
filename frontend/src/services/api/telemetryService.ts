import axios, { type AxiosRequestConfig } from "axios";
import { getApiConfig, type PingResult } from "../apiConfig";
import type { DataSnapshot, Alert, WeatherSnapshot, KpiSummary } from "@/types/domain";
import { getAdaptive, postAdaptive } from "./httpClient";

/**
 * Health & Ping API
 */
export const healthApi = {
  async ping(customBaseUrl?: string, timeoutMs = 4500): Promise<PingResult> {
    const baseURL = customBaseUrl ? customBaseUrl : getApiConfig().httpUrl;
    const startTime = performance.now();

    const testEndpoints = ["/snapshot", "/api/snapshot", "/health", "/api/health", "/vehicles", "/"];

    for (const ep of testEndpoints) {
      try {
        const res = await axios.get(`${baseURL}${ep}`, {
          timeout: timeoutMs,
          headers: { Accept: "application/json, text/plain, */*" }
        });

        return {
          reachable: true,
          latencyMs: Math.round(performance.now() - startTime),
          status: res.status,
          endpointTested: ep || "/"
        };
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response) {
          // A response with status code (even 401, 403, 404) proves server is reachable!
          return {
            reachable: true,
            latencyMs: Math.round(performance.now() - startTime),
            status: err.response.status,
            endpointTested: ep || "/"
          };
        }
      }
    }

    return {
      reachable: false,
      latencyMs: Math.round(performance.now() - startTime),
      error: `Could not reach ${baseURL}. Check network connection, firewall, and server status.`
    };
  }
};

/**
 * Snapshot API (consolidated state)
 */
export const snapshotApi = {
  async getSnapshot(config?: AxiosRequestConfig): Promise<DataSnapshot> {
    const data = await getAdaptive<DataSnapshot | { data: DataSnapshot }>("/snapshot", "/api/snapshot", config);
    if (data && typeof data === "object" && "data" in data) {
      return (data as { data: DataSnapshot }).data;
    }
    return data as DataSnapshot;
  }
};

/**
 * Alerts API
 */
export const alertApi = {
  async getAll(config?: AxiosRequestConfig): Promise<Alert[]> {
    const d = await getAdaptive<Alert[] | { data: Alert[] }>("/alerts", "/api/alerts", config);
    return (Array.isArray(d) ? d : (d as { data: Alert[] })?.data || []) as Alert[];
  }
};

/**
 * Weather API
 */
export const weatherApi = {
  async getAll(config?: AxiosRequestConfig): Promise<WeatherSnapshot[]> {
    const d = await getAdaptive<WeatherSnapshot[] | { data: WeatherSnapshot[] }>("/weather", "/api/weather", config);
    return (Array.isArray(d) ? d : (d as { data: WeatherSnapshot[] })?.data || []) as WeatherSnapshot[];
  }
};

/**
 * KPIs API
 */
export const kpiApi = {
  async getKpis(config?: AxiosRequestConfig): Promise<KpiSummary> {
    const d = await getAdaptive<KpiSummary | { data: KpiSummary }>("/kpis", "/api/kpis", config);
    if (d && typeof d === "object" && "data" in d) {
      return (d as { data: KpiSummary }).data;
    }
    return d as KpiSummary;
  }
};

/**
 * Flagship Scenario Demo API
 */
export const demoApi = {
  async triggerEvent(event: "heavy_rainfall" | "reset"): Promise<void> {
    await postAdaptive("/demo/trigger", "/api/demo/trigger", { event }).catch((err) => {
      console.warn("Backend demo trigger was not processed:", err);
    });
  }
};
