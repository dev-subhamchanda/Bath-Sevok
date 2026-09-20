import axios from "axios";

/**
 * Centralized API & Realtime Connection Configuration
 * Handles URL sanitization, environment variable fallbacks,
 * localStorage overrides, and backend reachability testing.
 */

const STORAGE_KEY_API_URL = process.env.BACKEND_URI;
const STORAGE_KEY_SOURCE_TYPE = "ner_logistics_source_type";

export interface ApiConnectionConfig {
  httpUrl: string;
  wsUrl: string;
  sourceType: "mock" | "live";
}

export interface PingResult {
  reachable: boolean;
  latencyMs: number;
  status?: number;
  error?: string;
  endpointTested?: string;
}

/**
 * Normalizes user or environment provided URLs into a canonical format:
 * - Trims whitespace and quotes
 * - Converts "10.215.235.233/(5000)" or "10.215.235.233(5000)" -> "http://10.215.235.233:5000"
 * - Adds default "http://" protocol if omitted
 * - Strips trailing slashes
 */
export function normalizeHttpUrl(rawUrl: string): string {
  if (!rawUrl) return "http://localhost:8000";

  let cleaned = rawUrl.trim().replace(/^["']|["']$/g, "");

  // Fix patterns like 10.215.235.233/(5000) or 10.215.235.233/(8000)
  cleaned = cleaned.replace(/\/\((\d+)\)/g, ":$1");
  // Fix patterns like 10.215.235.233(5000)
  cleaned = cleaned.replace(/\((\d+)\)/g, ":$1");

  // Prepend http:// if no protocol provided
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `http://${cleaned}`;
  }

  // Remove any trailing slashes or quotes
  cleaned = cleaned.replace(/["'/]+$/, "");

  return cleaned;
}

/**
 * Derives a WebSocket URL from an HTTP/S base URL or explicit WS URL:
 * e.g. "http://10.215.235.233:5000" -> "ws://10.215.235.233:5000/ws"
 * e.g. "https://api.example.com" -> "wss://api.example.com/ws"
 */
export function deriveWsUrl(httpBaseUrl: string, explicitWsUrl?: string): string {
  const customWs = explicitWsUrl?.trim().replace(/^["']|["']$/g, "");
  // If explicit WS URL is provided and not defaulting to localhost while HTTP is pointing elsewhere
  if (customWs && (!customWs.includes("localhost:8000") || httpBaseUrl.includes("localhost:8000"))) {
    return customWs;
  }

  const isSecure = httpBaseUrl.startsWith("https://");
  const hostAndPort = httpBaseUrl.replace(/^https?:\/\//i, "");
  return `${isSecure ? "wss://" : "ws://"}${hostAndPort}/ws`;
}

/**
 * Resolves current connection configuration
 */
export function getApiConfig(): ApiConnectionConfig {
  const storedUrl = localStorage.getItem(STORAGE_KEY_API_URL);
  const storedSourceType = localStorage.getItem(STORAGE_KEY_SOURCE_TYPE) as "mock" | "live" | null;

  const rawEnvBackendUrl =
    import.meta.env.VITE_API_BACKEND_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000";

  const rawEnvWsUrl = import.meta.env.VITE_WS_URL;
  const rawEnvSourceType = (import.meta.env.VITE_DATA_SOURCE || "mock") as "mock" | "live";

  const httpUrl = normalizeHttpUrl(storedUrl || rawEnvBackendUrl);
  const wsUrl = deriveWsUrl(httpUrl, rawEnvWsUrl);
  const sourceType = storedSourceType || rawEnvSourceType;

  return {
    httpUrl,
    wsUrl,
    sourceType
  };
}

/**
 * Persists runtime configuration overrides
 */
export function setApiConfig(customUrl?: string, customSourceType?: "mock" | "live"): void {
  if (customUrl !== undefined) {
    const normalized = normalizeHttpUrl(customUrl);
    localStorage.setItem(STORAGE_KEY_API_URL, normalized);
  }
  if (customSourceType !== undefined) {
    localStorage.setItem(STORAGE_KEY_SOURCE_TYPE, customSourceType);
  }
  window.dispatchEvent(new CustomEvent("ner:apiConfigChanged", { detail: getApiConfig() }));
}

/**
 * Resets connection configuration to .env defaults
 */
export function resetApiConfig(): void {
  localStorage.removeItem(STORAGE_KEY_API_URL);
  localStorage.removeItem(STORAGE_KEY_SOURCE_TYPE);
  window.dispatchEvent(new CustomEvent("ner:apiConfigChanged", { detail: getApiConfig() }));
}

/**
 * Pings backend to verify reachability and measure round-trip latency
 */
export async function pingBackend(
  customBaseUrl?: string,
  timeoutMs = 4000
): Promise<PingResult> {
  const baseUrl = customBaseUrl ? normalizeHttpUrl(customBaseUrl) : getApiConfig().httpUrl;
  const startTime = performance.now();

  // Try health or root or snapshot endpoints
  const testEndpoints = ["/api/snapshot", "/api/health", "/api/vehicles", ""];

  for (const ep of testEndpoints) {
    try {
      const target = `${baseUrl}${ep}`;
      const res = await axios.get(target, {
        timeout: timeoutMs,
        headers: { Accept: "application/json, text/plain, */*" }
      });

      const latencyMs = Math.round(performance.now() - startTime);

      // Any HTTP response (even 404 or 401) indicates the host is reachable
      return {
        reachable: true,
        latencyMs,
        status: res.status,
        endpointTested: ep || "/"
      };
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
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
    error: `Could not connect to ${baseUrl}. Check if backend server is running and accessible.`
  };
}
