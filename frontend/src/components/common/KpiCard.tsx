import React from "react";

export interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  iconColor?: string;
  badgeText?: string;
  badgeVariant?: "success" | "danger" | "warning" | "info" | "neutral";
  subtitle?: string;
  footerIcon?: string;
  footerText?: string;
  footerIconColor?: string;
  compact?: boolean;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  icon,
  iconColor = "text-[#003356]",
  badgeText,
  badgeVariant = "neutral",
  subtitle,
  footerIcon,
  footerText,
  footerIconColor = "text-[#72777f]",
  compact = false,
  className = ""
}) => {
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#e5e8ee] shadow-xs ${className}`}
      >
        {icon && (
          <span className={`material-symbols-outlined text-[18px] ${iconColor}`}>
            {icon}
          </span>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-[#181c20]">{value}</span>
          <span className="text-[11px] text-[#72777f]">{unit || label}</span>
        </div>
      </div>
    );
  }

  const badgeStyles: Record<string, string> = {
    success: "bg-[#e6f4ea] text-[#137333]",
    danger: "bg-[#ffdad6] text-[#ba1a1a]",
    warning: "bg-[#fef7e0] text-[#b06000]",
    info: "bg-[#cfe4ff] text-[#001d34]",
    neutral: "bg-slate-100 text-slate-700"
  };

  return (
    <div
      className={`bg-white p-3.5 sm:p-4 rounded-xl border border-[#e5e8ee] shadow-xs flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#72777f] font-semibold truncate">
          {label}
        </span>
        {badgeText && (
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${
              badgeStyles[badgeVariant] || badgeStyles.neutral
            }`}
          >
            {badgeText}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold text-[#181c20] tracking-tight">
          {value}
        </span>
        {unit && <span className="text-xs text-[#72777f] font-medium">{unit}</span>}
        {subtitle && <span className="text-xs text-[#42474e]">{subtitle}</span>}
      </div>

      {(footerText || footerIcon) && (
        <div className="mt-2 text-[10px] sm:text-[11px] text-[#72777f] flex items-center gap-1">
          {footerIcon && (
            <span
              className={`material-symbols-outlined text-[14px] sm:text-[16px] ${footerIconColor}`}
            >
              {footerIcon}
            </span>
          )}
          {footerText && <span className="truncate">{footerText}</span>}
        </div>
      )}
    </div>
  );
};
