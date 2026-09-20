import React from "react";

export type StatusBadgeType = "vehicle" | "consignment" | "road" | "severity" | "generic";

export interface StatusBadgeProps {
  type?: StatusBadgeType;
  status: string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type = "generic",
  status,
  label,
  size = "md",
  className = ""
}) => {
  const normalized = (status || "").toLowerCase().replace(/[\s-]/g, "_");

  let colorClasses = "bg-slate-100 text-slate-700";
  let displayLabel = label || status;

  if (type === "vehicle") {
    switch (normalized) {
      case "moving":
      case "active":
      case "en_route":
        colorClasses = "bg-emerald-100 text-emerald-800";
        displayLabel = label || "Moving";
        break;
      case "delayed":
      case "caution":
        colorClasses = "bg-rose-100 text-rose-800";
        displayLabel = label || "Delayed";
        break;
      case "idle":
      case "available":
      case "standby":
        colorClasses = "bg-amber-100 text-amber-800";
        displayLabel = label || "Idle";
        break;
      case "breakdown":
      case "maintenance":
        colorClasses = "bg-red-200 text-red-900";
        displayLabel = label || "Breakdown";
        break;
      default:
        colorClasses = "bg-slate-100 text-slate-800";
    }
  } else if (type === "consignment") {
    switch (normalized) {
      case "in_transit":
      case "moving":
        colorClasses = "bg-[#cfe4ff] text-[#001d34]";
        displayLabel = label || "In Transit";
        break;
      case "delayed":
        colorClasses = "bg-[#ffdad6] text-[#ba1a1a]";
        displayLabel = label || "Delayed";
        break;
      case "delivered":
        colorClasses = "bg-[#e6f4ea] text-[#137333]";
        displayLabel = label || "Delivered";
        break;
      case "pending":
      case "created":
        colorClasses = "bg-slate-100 text-slate-700";
        displayLabel = label || "Pending";
        break;
      default:
        colorClasses = "bg-slate-100 text-slate-800";
    }
  } else if (type === "road") {
    switch (normalized) {
      case "accessible":
      case "clear":
      case "open":
        colorClasses = "bg-[#e6f4ea] text-[#137333]";
        displayLabel = label || "Accessible";
        break;
      case "at_risk":
      case "under_observation":
      case "caution":
        colorClasses = "bg-[#fef7e0] text-[#b06000]";
        displayLabel = label || (normalized === "at_risk" ? "At Risk" : "Under Observation");
        break;
      case "blocked":
      case "closed":
        colorClasses = "bg-[#fce8e6] text-[#c5221f]";
        displayLabel = label || "Blocked";
        break;
      default:
        colorClasses = "bg-slate-100 text-slate-800";
    }
  } else if (type === "severity") {
    switch (normalized) {
      case "critical":
        colorClasses = "bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/20";
        displayLabel = label || "Critical";
        break;
      case "high":
        colorClasses = "bg-amber-100 text-amber-800 border border-amber-300/40";
        displayLabel = label || "High";
        break;
      case "medium":
      case "moderate":
        colorClasses = "bg-yellow-100 text-yellow-800 border border-yellow-300/40";
        displayLabel = label || "Medium";
        break;
      case "low":
      case "info":
        colorClasses = "bg-sky-100 text-sky-800 border border-sky-300/40";
        displayLabel = label || "Low";
        break;
      default:
        colorClasses = "bg-slate-100 text-slate-800";
    }
  } else {
    // Generic
    if (normalized.includes("critical") || normalized.includes("blocked") || normalized.includes("delayed")) {
      colorClasses = "bg-rose-100 text-rose-800";
    } else if (normalized.includes("warn") || normalized.includes("risk") || normalized.includes("idle")) {
      colorClasses = "bg-amber-100 text-amber-800";
    } else if (normalized.includes("open") || normalized.includes("access") || normalized.includes("deliver")) {
      colorClasses = "bg-emerald-100 text-emerald-800";
    }
  }

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] font-semibold"
      : "px-2.5 py-1 text-xs font-semibold";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full capitalize tracking-wide transition-colors ${sizeClasses} ${colorClasses} ${className}`}
    >
      {displayLabel}
    </span>
  );
};
