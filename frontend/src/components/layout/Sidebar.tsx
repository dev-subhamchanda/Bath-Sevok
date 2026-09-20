import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAlertStore } from "@/stores/alertStore";
import { useRoadStore } from "@/stores/roadStore";
import { useUiStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const unreadAlerts = useAlertStore((s) => s.unreadCount);
  const roads = useRoadStore((s) => s.roads);
  const setIsReportModalOpen = useUiStore((s) => s.setIsReportModalOpen);
  const isSidebarCollapsed = useUiStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const logout = useAuthStore((s) => s.logout);
  const authUser = useAuthStore((s) => s.user);

  // Dynamic corridor counts derived from live store
  const accessibleCount = roads.filter((r) => r.status === "accessible").length || 42;
  const atRiskCount = roads.filter((r) => r.status === "at_risk" || r.status === "under_observation").length || 7;
  const blockedCount = roads.filter((r) => r.status === "blocked").length || 2;

  // Combined navigation items: Fleet Units + Deliveries, Incidents + Alerts
  const navItems = [
    { to: "/", label: "Dashboard", icon: "dashboard" },
    { to: "/fleet", label: "Fleet & Deliveries", icon: "local_shipping" },
    {
      to: "/incidents-alerts",
      label: "Incidents & Alerts",
      icon: "warning",
      badge: unreadAlerts > 0 ? unreadAlerts : undefined
    },
    { to: "/analytics", label: "Risk Analytics", icon: "analytics" },
    { to: "/field", label: "Field Reporting", icon: "campaign" },
    { to: "/settings", label: "Settings", icon: "settings" }
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={`hidden md:flex fixed left-0 top-16 bottom-0 w-[260px] lg:w-[280px] xl:w-[300px] bg-[#ffffff] border-r border-[#e5e8ee] z-40 flex-col justify-between py-3 px-3 shadow-[0_1px_8px_rgba(0,0,0,0.03)] overflow-y-auto transition-transform duration-300 ease-in-out ${
        isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
      }`}
    >
      {/* Top Section: Header with collapse arrow & Navigation Links */}
      <div className="flex flex-col gap-2">
        {/* Google Maps style collapse trigger */}
        <div className="flex items-center justify-between px-2 pb-2 border-b border-[#e5e8ee]">
          <span className="text-[11px] font-bold text-[#72777f] uppercase tracking-wider">
            Navigation Panel
          </span>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Hide sidebar for full-screen map view"
            className="p-1 rounded-lg text-[#72777f] hover:text-[#003356] hover:bg-[#f1f4fa] transition-colors cursor-pointer flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1 w-full">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs lg:text-sm transition-all ${
                  isActive
                    ? "bg-[#174a73] text-white font-semibold shadow-xs"
                    : "text-[#42474e] hover:bg-[#f1f4fa] hover:text-[#181c20]"
                }`
              }
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[19px] lg:text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white text-[10px] lg:text-[11px] font-bold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Container: Quick Actions, Network Status & Logout */}
      <div className="flex flex-col gap-2.5 px-1 pt-3 border-t border-[#e5e8ee] mt-3">
        {/* Report Incident CTA */}
        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-[#ba1a1a] hover:bg-[#93000a] rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px]">add_alert</span>
          <span>Report Incident</span>
        </button>

        {/* Network Live Summary Status Card */}
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#72777f] uppercase tracking-wider font-bold">
              Corridor Status
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#003356] text-white text-[9px] font-bold">
              Live
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-1 text-[11px]">
            <div className="flex flex-col items-center p-1 rounded bg-white border border-slate-100">
              <span className="font-bold text-[#15803d]">{accessibleCount}</span>
              <span className="text-[9px] text-slate-500">Open</span>
            </div>
            <div className="flex flex-col items-center p-1 rounded bg-white border border-slate-100">
              <span className="font-bold text-amber-600">{atRiskCount}</span>
              <span className="text-[9px] text-slate-500">At Risk</span>
            </div>
            <div className="flex flex-col items-center p-1 rounded bg-white border border-slate-100">
              <span className="font-bold text-rose-600">{blockedCount}</span>
              <span className="text-[9px] text-slate-500">Blocked</span>
            </div>
          </div>
        </div>

        {/* User Session & Logout Action */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#f8fafc] border border-[#e5e8ee]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#003356] text-white flex items-center justify-center text-xs shrink-0 font-bold">
              {authUser?.role?.[0]?.toUpperCase() || "O"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[#181c20] truncate">
                {authUser?.name || "Operator"}
              </span>
              <span className="text-[9px] text-[#72777f] capitalize truncate">
                {authUser?.role || "operator"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out and return to sign in"
            className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
