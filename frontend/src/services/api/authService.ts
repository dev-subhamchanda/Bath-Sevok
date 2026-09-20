import axios from "axios";
import { apiClient } from "./httpClient";

export interface AuthCredentials {
  email: string;
  password?: string;
  username?: string;
  role?: string;
}

export interface RegisterUserData {
  name: string;
  email: string;
  password?: string;
  role?: string;
  phone?: string;
  username?: string;
  vehicleType?: string;
}

export interface AuthSuccessPayload {
  token?: string;
  accessToken?: string;
  jwt?: string;
  user?: unknown;
  message?: string;
  [key: string]: unknown;
}

/**
 * Authentication Service
 * Handles user signin, registration, session termination, and JWT persistence.
 */
export const authApi = {
  /**
   * Primary sign-in method: sends POST to /auth/signin (with adaptive fallback to /auth/login)
   */
  async signin(credentials: AuthCredentials): Promise<AuthSuccessPayload> {
    // Strictly send only email and password as expected by backend route
    const payload = {
      email: credentials.email,
      password: credentials.password
    };

    // Primary target: /auth/signin, fallback: /auth/login if route does not exist
    let rawResponse: unknown;
    try {
      const res = await apiClient.post<AuthSuccessPayload>("/auth/signin", payload);
      rawResponse = res.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        // If route does not exist (404 with HTML / Cannot POST), attempt /auth/login
        const isRouteNotFound =
          err.response?.status === 404 &&
          typeof err.response?.data === "string" &&
          err.response.data.includes("Cannot POST");

        if (isRouteNotFound) {
          const fallbackRes = await apiClient.post<AuthSuccessPayload>("/auth/login", payload);
          rawResponse = fallbackRes.data;
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    // Extract token from various standard backend response structures
    const data = (rawResponse && typeof rawResponse === "object" && "data" in rawResponse
      ? (rawResponse as { data: AuthSuccessPayload }).data
      : rawResponse) as AuthSuccessPayload;

    const token =
      data?.token ||
      data?.accessToken ||
      data?.jwt ||
      (typeof data?.data === "object" && data?.data && "token" in data.data
        ? (data.data as { token?: string }).token
        : undefined);

    if (token && typeof token === "string") {
      localStorage.setItem("ner_auth_token", token);
    }

    return data;
  },

  /**
   * Alias for signin
   */
  async login(credentials: AuthCredentials): Promise<AuthSuccessPayload> {
    return this.signin(credentials);
  },

  /**
   * Sign-up / Register user: sends POST to /auth/signup (with adaptive fallback to /auth/register)
   */
  async signup(data: RegisterUserData): Promise<unknown> {
    try {
      const res = await apiClient.post("/auth/signup", data);
      return res.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const isRouteNotFound =
          err.response?.status === 404 &&
          typeof err.response?.data === "string" &&
          err.response.data.includes("Cannot POST");

        if (isRouteNotFound) {
          const res = await apiClient.post("/auth/register", data);
          return res.data;
        }
      }
      throw err;
    }
  },

  /**
   * Terminate active backend session and delete local JWT
   */
  async logout(): Promise<void> {
    localStorage.removeItem("ner_auth_token");
    try {
      await apiClient.post("/auth/logout", {});
    } catch {
      // Best-effort logout notification
    }
  },

  /**
   * Read stored token
   */
  getToken(): string | null {
    return localStorage.getItem("ner_auth_token");
  },

  /**
   * Check if token is present
   */
  hasToken(): boolean {
    return !!localStorage.getItem("ner_auth_token");
  }
};
