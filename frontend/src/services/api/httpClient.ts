import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from "axios";
import { getApiConfig } from "../apiConfig";

/**
 * Centralized Axios instance for all NER Logistics API requests.
 */
export const apiClient: AxiosInstance = axios.create({
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  }
});

// Dynamic BaseURL & Auth Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    // When running in the browser on the Vite dev server (port 3000),
    // route requests through the local dev server proxy to completely eliminate CORS OPTIONS preflight requests!
    if (!config.baseURL) {
      if (typeof window !== "undefined" && (window.location.port === "3000" || window.location.hostname === "localhost")) {
        config.baseURL = "";
      } else {
        config.baseURL = getApiConfig().httpUrl;
      }
    }

    // Do NOT inject auth tokens on auth routes (/auth/signin, /auth/signup) to keep requests lightweight
    const isAuthRoute = typeof config.url === "string" && config.url.includes("/auth");
    if (!isAuthRoute) {
      const token = localStorage.getItem("ner_auth_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers["x-access-token"] = token;
        config.headers.token = token;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for Logging and Pre-formatting
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      console.warn(
        `[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} failed with status ${error.response.status}:`,
        error.response.data
      );
    } else if (error.request) {
      console.warn(
        `[API] No response received from server for ${error.config?.method?.toUpperCase()} ${error.config?.url}`
      );
    }
    return Promise.reject(error);
  }
);

/**
 * Adaptive HTTP request helpers supporting routes both with and without /api/ prefix
 */
export async function getAdaptive<T>(primaryPath: string, fallbackPath: string, config?: AxiosRequestConfig): Promise<T> {
  try {
    const res = await apiClient.get<T>(primaryPath, config);
    return res.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      const res = await apiClient.get<T>(fallbackPath, config);
      return res.data;
    }
    throw err;
  }
}

export async function postAdaptive<T>(primaryPath: string, fallbackPath: string, body: unknown, config?: AxiosRequestConfig): Promise<T> {
  try {
    const res = await apiClient.post<T>(primaryPath, body, config);
    return res.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      const res = await apiClient.post<T>(fallbackPath, body, config);
      return res.data;
    }
    throw err;
  }
}

/**
 * Robust error message extractor for Axios errors
 */
export function formatAxiosError(err: unknown, fallbackMessage = "API request failed"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (typeof data === "string" && data.trim()) {
      return data;
    }
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      if (typeof record.message === "string") return record.message;
      if (typeof record.error === "string") return record.error;
      if (typeof record.detail === "string") return record.detail;
    }
    if (err.code === "ECONNABORTED") {
      return "Request timed out. The backend server took too long to reply.";
    }
    if (!err.response) {
      return "Unable to connect to the backend server. Server may be offline or unreachable.";
    }
    return `Server returned error (${err.response.status}): ${err.response.statusText}`;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallbackMessage;
}
