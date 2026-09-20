import React from "react";
import { NavLink } from "react-router-dom";
import { useAlertStore } from "@/stores/alertStore";

export const BottomNav: React.FC<{ className?: string }> = ({ className = "" }) => {
  const unreadAlerts = useAlertStore((s) => s.unreadCount);

  const navItems = [
    { to: "/", label: "Dashboard", icon: "grid_view" },
    { to: "/fleet", label: "Fleet & Ops", icon: "local_shipping" },
    {
      to: "/incidents-alerts",
      label: "Incidents & Alerts",
      icon: "warning",
      badge: unreadAlerts > 0 ? unreadAlerts : undefined
    },
    { to: "/analytics", label: "Analytics", icon: "monitoring" },
    { to: "/field", label: "Field", icon: "campaign" }
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 pb-safe bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-1px_12px_rgba(0,0,0,0.06)] md:hidden ${className}`}
    >
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 min-w-[3.75rem] py-1.5 rounded-xl transition-all ${
                isActive
                  ? "text-[#003356] font-bold"
                  : "text-slate-500 hover:text-slate-900 font-medium"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative flex items-center justify-center">
                  <span
                    className={`material-symbols-outlined text-[22px] transition-transform ${
                      isActive ? "scale-110 text-[#003356]" : "text-slate-500"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-[#ba1a1a] text-white text-[9px] font-bold leading-none ring-2 ring-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] tracking-tight ${
                    isActive ? "font-bold text-[#003356]" : "text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-[#003356] -mb-1" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
