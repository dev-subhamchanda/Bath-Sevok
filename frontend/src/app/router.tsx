import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute, PublicOnlyRoute } from "./router/RouteGuards";

export const router = createBrowserRouter([
  {
    path: "/login",
    lazy: async () => {
      const { LoginPage } = await import("@/pages/Login/LoginPage");
      return {
        Component: () => (
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        )
      };
    }
  },
  {
    path: "/role-selection",
    element: <Navigate to="/settings" replace />
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        lazy: async () => {
          const { DashboardPage } = await import("@/pages/Dashboard/DashboardPage");
          return { Component: DashboardPage };
        }
      },
      {
        path: "dashboard",
        lazy: async () => {
          const { DashboardPage } = await import("@/pages/Dashboard/DashboardPage");
          return { Component: DashboardPage };
        }
      },
      {
        path: "command-center",
        lazy: async () => {
          const { DashboardPage } = await import("@/pages/Dashboard/DashboardPage");
          return { Component: DashboardPage };
        }
      },
      {
        path: "fleet",
        lazy: async () => {
          const { FleetPage } = await import("@/pages/Fleet/FleetPage");
          return { Component: FleetPage };
        }
      },
      {
        path: "operations",
        lazy: async () => {
          const { FleetPage } = await import("@/pages/Fleet/FleetPage");
          return { Component: FleetPage };
        }
      },
      {
        path: "deliveries",
        lazy: async () => {
          const { DeliveriesPage } = await import("@/pages/Fleet/DeliveriesPage");
          return { Component: DeliveriesPage };
        }
      },
      {
        path: "incidents",
        lazy: async () => {
          const { IncidentsAlertsPage } = await import("@/pages/IncidentsAlerts/IncidentsAlertsPage");
          return { Component: () => <IncidentsAlertsPage initialTab="incidents" key="incidents-screen" /> };
        }
      },
      {
        path: "alerts",
        lazy: async () => {
          const { IncidentsAlertsPage } = await import("@/pages/IncidentsAlerts/IncidentsAlertsPage");
          return { Component: () => <IncidentsAlertsPage initialTab="alerts" key="alerts-screen" /> };
        }
      },
      {
        path: "incidents-alerts",
        lazy: async () => {
          const { IncidentsAlertsPage } = await import("@/pages/IncidentsAlerts/IncidentsAlertsPage");
          return { Component: () => <IncidentsAlertsPage key="incidents-alerts-screen" /> };
        }
      },
      {
        path: "analytics",
        lazy: async () => {
          const { AnalyticsPage } = await import("@/pages/Analytics/AnalyticsPage");
          return { Component: AnalyticsPage };
        }
      },
      {
        path: "field",
        lazy: async () => {
          const { FieldReportingPage } = await import("@/pages/IncidentsAlerts/FieldReportingPage");
          return { Component: FieldReportingPage };
        }
      },
      {
        path: "report-incident",
        lazy: async () => {
          const { FieldReportingPage } = await import("@/pages/IncidentsAlerts/FieldReportingPage");
          return { Component: FieldReportingPage };
        }
      },
      {
        path: "settings",
        lazy: async () => {
          const { SettingsPage } = await import("@/pages/Settings/SettingsPage");
          return { Component: SettingsPage };
        }
      },
      {
        path: "*",
        element: <Navigate to="/" replace />
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />
  }
]);
