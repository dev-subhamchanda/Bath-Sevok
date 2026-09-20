import React from "react";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  shortLabel?: string;
  icon?: string;
  count?: number;
}

export interface TabSwitcherProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  variant?: "pill" | "button";
  className?: string;
}

export function TabSwitcher<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  variant = "pill",
  className = ""
}: TabSwitcherProps<T>) {
  if (variant === "button") {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isActive
                  ? "bg-[#003356] text-white shadow-xs"
                  : "bg-white text-[#42474e] hover:bg-[#f1f4fa] border border-[#e5e8ee]"
              }`}
            >
              {tab.icon && (
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Pill variant (default)
  return (
    <div
      className={`flex items-center bg-[#f1f4fa] p-1 rounded-lg border border-[#e5e8ee] ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              isActive
                ? "bg-white text-[#003356] shadow-xs"
                : "text-[#42474e] hover:text-[#181c20]"
            }`}
          >
            {tab.icon && (
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            )}
            {tab.shortLabel ? (
              <>
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </>
            ) : (
              <span>{tab.label}</span>
            )}
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-[#003356]/10 text-[#003356]" : "bg-slate-200/60 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
