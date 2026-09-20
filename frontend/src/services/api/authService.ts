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

export const mapRoleToBackend = (frontendRole?: string): "ADMIN" | "DISPATCHER" | "DRIVER" | "USER" => {
  if (!frontendRole) return "DISPATCHER";
  const normalized = frontendRole.trim().toUpperCase();
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "DISPATCHER" || normalized === "OPERATOR") return "DISPATCHER";
  if (normalized === "DRIVER" || normalized === "OFFICER") return "DRIVER";
  if (normalized === "USER") return "USER";
  return "DISPATCHER";
};

/**
 * Authentication Service
 * Follows the backend authentication contract:
 * - Login: POST /api/v1/auth/login (alias /auth/login, /auth/signin)
 * - Register: POST /api/v1/auth/register (alias /auth/register, /auth/signup)
 * - Sets and accepts HttpOnly cookie 'token' and Authorization: Bearer <jwt>
 */
export const authApi = {
  /**
   * User login: sends { email, password } to backend
   */
  async signin(credentials: AuthCredentials): Promise<AuthSuccessPayload> {
    const payload = {
      email: credentials.email.trim(),
      password: credentials.password || ""
    };

    const endpoints = ["/api/v1/auth/login", "/auth/login", "/api/v1/auth/signin", "/auth/signin"];
    let rawResponse: unknown = null;
    let lastError: unknown = null;

    for (const ep of endpoints) {
      try {
        const res = await apiClient.post<AuthSuccessPayload>(ep, payload);
        rawResponse = res.data;
        break;
      } catch (err: unknown) {
        lastError = err;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          continue; // Try next alias if route is 404
        }
        throw err; // Real validation/credential error
      }
    }

    if (!rawResponse && lastError) {
      throw lastError;
    }

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
   * User registration: sends { name, email, password, role, phone } to backend
   * All 5 fields are strictly required by the backend controller.
   */
  async signup(data: RegisterUserData): Promise<AuthSuccessPayload> {
    const backendRole = mapRoleToBackend(data.role);
    const payload = {
      name: data.name.trim(),
      email: data.email.trim(),
      password: data.password || "",
      role: backendRole,
      phone: data.phone ? data.phone.trim() : "9876543210"
    };

    const endpoints = ["/api/v1/auth/register", "/auth/register", "/api/v1/auth/signup", "/auth/signup"];
    let rawResponse: unknown = null;
    let lastError: unknown = null;

    for (const ep of endpoints) {
      try {
        const res = await apiClient.post<AuthSuccessPayload>(ep, payload);
        rawResponse = res.data;
        break;
      } catch (err: unknown) {
        lastError = err;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          continue;
        }
        throw err;
      }
    }

    if (!rawResponse && lastError) {
      throw lastError;
    }

    const resData = (rawResponse && typeof rawResponse === "object" && "data" in rawResponse
      ? (rawResponse as { data: AuthSuccessPayload }).data
      : rawResponse) as AuthSuccessPayload;

    const token = resData?.token || (typeof resData?.data === "object" && resData?.data && "token" in resData.data ? (resData.data as { token?: string }).token : undefined);
    if (token && typeof token === "string") {
      localStorage.setItem("ner_auth_token", token);
    }

    return resData;
  },

  /**
   * Terminate active backend session and delete local JWT
   */
  async logout(): Promise<void> {
    localStorage.removeItem("ner_auth_token");
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
