import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute, PublicOnlyRoute } from "./router/RouteGuards";
import { DashboardPage } from "@/pages/Dashboard/DashboardPage";
import { FleetPage } from "@/pages/Fleet/FleetPage";
import { DeliveriesPage } from "@/pages/Fleet/DeliveriesPage";
import { IncidentsAlertsPage } from "@/pages/IncidentsAlerts/IncidentsAlertsPage";
import { AnalyticsPage } from "@/pages/Analytics/AnalyticsPage";
import { FieldReportingPage } from "@/pages/IncidentsAlerts/FieldReportingPage";
import { LoginPage } from "@/pages/Login/LoginPage";
import { SettingsPage } from "@/pages/Settings/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    )
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
        element: <DashboardPage />
      },
      {
        path: "dashboard",
        element: <DashboardPage />
      },
      {
        path: "command-center",
        element: <DashboardPage />
      },
      {
        path: "fleet",
        element: <FleetPage />
      },
      {
        path: "operations",
        element: <FleetPage />
      },
      {
        path: "deliveries",
        element: <DeliveriesPage />
      },
      {
        path: "incidents",
        element: <IncidentsAlertsPage initialTab="incidents" key="incidents-screen" />
      },
      {
        path: "alerts",
        element: <IncidentsAlertsPage initialTab="alerts" key="alerts-screen" />
      },
      {
        path: "incidents-alerts",
        element: <IncidentsAlertsPage key="incidents-alerts-screen" />
      },
      {
        path: "analytics",
        element: <AnalyticsPage />
      },
      {
        path: "field",
        element: <FieldReportingPage />
      },
      {
        path: "report-incident",
        element: <FieldReportingPage />
      },
      {
        path: "settings",
        element: <SettingsPage />
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
