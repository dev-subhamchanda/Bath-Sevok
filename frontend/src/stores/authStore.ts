import { create } from "zustand";
import type { UserRole } from "@/types/domain";
import { useUiStore } from "./uiStore";

export interface AuthUser {
  email: string;
  name: string;
  role: UserRole;
  vehicleType: "heavy" | "four-wheeler" | "two-wheeler";
  idType: string;
  lastLoginAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  hasSelectedProfile: boolean;
  user: AuthUser | null;
  login: (email: string, role?: UserRole, vehicleType?: "heavy" | "four-wheeler" | "two-wheeler") => void;
  selectProfile: (role: UserRole, vehicleType: "heavy" | "four-wheeler" | "two-wheeler") => void;
  logout: () => void;
}

const STORAGE_KEY = "ner_logistics_auth_session";

interface StoredSession {
  isAuthenticated: boolean;
  hasSelectedProfile: boolean;
  user: AuthUser | null;
}

const getInitialState = (): {
  isAuthenticated: boolean;
  hasSelectedProfile: boolean;
  user: AuthUser | null;
} => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: StoredSession = JSON.parse(raw);
      if (parsed.isAuthenticated) {
        // Sync uiStore on restore
        if (parsed.user) {
          useUiStore.getState().setActiveRole(parsed.user.role);
          useUiStore.getState().setSelectedVehicleType(parsed.user.vehicleType);
        }
        return {
          isAuthenticated: true,
          hasSelectedProfile: !!parsed.hasSelectedProfile,
          user: parsed.user
        };
      }
    }
  } catch (e) {
    console.error("Failed to read auth session from storage", e);
  }
  return {
    isAuthenticated: false,
    hasSelectedProfile: false,
    user: null
  };
};

const saveSession = (state: {
  isAuthenticated: boolean;
  hasSelectedProfile: boolean;
  user: AuthUser | null;
}) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to persist auth session", e);
  }
};

export const useAuthStore = create<AuthState>((set) => {
  const initial = getInitialState();

  return {
    isAuthenticated: initial.isAuthenticated,
    hasSelectedProfile: initial.hasSelectedProfile,
    user: initial.user,

    login: (
      email: string,
      role: UserRole = "operator",
      vehicleType?: "heavy" | "four-wheeler" | "two-wheeler"
    ) => {
      const defaultVehicles: Record<UserRole, "heavy" | "four-wheeler" | "two-wheeler"> = {
        admin: "heavy",
        operator: "four-wheeler",
        officer: "two-wheeler"
      };

      const nameMap: Record<UserRole, string> = {
        admin: "Regional Authority Admin",
        operator: "Kamrup Dispatch Operator",
        officer: "Field Transit Officer"
      };

      const idTypeMap: Record<UserRole, string> = {
        admin: "Officer ID / Badge #",
        operator: "Govt / Agency ID",
        officer: "Station / Unit ID"
      };

      const vehicle = vehicleType || defaultVehicles[role];
      const newUser: AuthUser = {
        email,
        name: nameMap[role],
        role,
        vehicleType: vehicle,
        idType: idTypeMap[role],
        lastLoginAt: new Date().toISOString()
      };

      // Synchronize with uiStore
      useUiStore.getState().setActiveRole(role);
      useUiStore.getState().setSelectedVehicleType(vehicle);

      const nextState = {
        isAuthenticated: true,
        hasSelectedProfile: true,
        user: newUser
      };

      saveSession(nextState);
      set(nextState);
    },

    selectProfile: (role: UserRole, vehicleType: "heavy" | "four-wheeler" | "two-wheeler") => {
      // Synchronize with uiStore
      useUiStore.getState().setActiveRole(role);
      useUiStore.getState().setSelectedVehicleType(vehicleType);

      set((state) => {
        const updatedUser: AuthUser = state.user
          ? { ...state.user, role, vehicleType }
          : {
              email: "operator@ner-transport.gov.in",
              name: role === "admin" ? "Regional Authority" : role === "officer" ? "Field Officer" : "Control Desk Operator",
              role,
              vehicleType,
              idType: "Govt / Agency ID",
              lastLoginAt: new Date().toISOString()
            };

        const nextState = {
          isAuthenticated: true,
          hasSelectedProfile: true,
          user: updatedUser
        };

        saveSession(nextState);
        return nextState;
      });
    },

    logout: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.error("Failed to clear auth session", e);
      }
      set({
        isAuthenticated: false,
        hasSelectedProfile: false,
        user: null
      });
    }
  };
});
