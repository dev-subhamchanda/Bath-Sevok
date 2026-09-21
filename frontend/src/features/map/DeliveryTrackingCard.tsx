import React from "react";
import type { Shipment } from "@/types/domain";

interface DeliveryTrackingCardProps {
  shipment: Shipment;
  allActiveShipments?: Shipment[];
  onSelectShipment?: (id: string) => void;
  onCloseTracking: () => void;
}

export const DeliveryTrackingCard: React.FC<DeliveryTrackingCardProps> = ({
  shipment,
  allActiveShipments = [],
  onSelectShipment,
  onCloseTracking
}) => {
  const backendStatus = (shipment.backendStatus || shipment.status || "PENDING").toUpperCase();

  // Status human-readable mapping
  const statusMeta: Record<string, { label: string; desc: string; color: string; badgeBg: string; badgeText: string }> = {
    PENDING: {
      label: "Order Placed",
      desc: "Order created, waiting for vehicle assignment",
      color: "bg-amber-500",
      badgeBg: "bg-amber-50 border-amber-200",
      badgeText: "text-amber-800"
    },
    ASSIGNED: {
      label: "Driver Assigned",
      desc: "Driver is preparing for consignment pickup",
      color: "bg-sky-500",
      badgeBg: "bg-sky-50 border-sky-200",
      badgeText: "text-sky-800"
    },
    IN_TRANSIT: {
      label: "On the Way",
      desc: "Vehicle is moving toward the destination",
      color: "bg-emerald-500",
      badgeBg: "bg-emerald-50 border-emerald-200",
      badgeText: "text-emerald-800"
    },
    DELIVERED: {
      label: "Delivered",
      desc: "Consignment successfully delivered to destination",
      color: "bg-emerald-600",
      badgeBg: "bg-emerald-100 border-emerald-300",
      badgeText: "text-emerald-900"
    },
    CANCELLED: {
      label: "Cancelled",
      desc: "Delivery has been cancelled",
      color: "bg-rose-500",
      badgeBg: "bg-rose-50 border-rose-200",
      badgeText: "text-rose-800"
    }
  };

  const currentMeta = statusMeta[backendStatus] || statusMeta.PENDING;

  // Real backend progress steps
  const steps = [
    { key: "PENDING", label: "Created" },
    { key: "ASSIGNED", label: "Assigned" },
    { key: "IN_TRANSIT", label: "In Transit" },
    { key: "DELIVERED", label: "Delivered" }
  ];

  const getStepStatus = (stepKey: string) => {
    const order = ["PENDING", "ASSIGNED", "IN_TRANSIT", "DELIVERED"];
    const currentIndex = order.indexOf(backendStatus);
    const stepIndex = order.indexOf(stepKey);

    if (backendStatus === "CANCELLED") {
      return "cancelled";
    }
    if (currentIndex > stepIndex) return "completed";
    if (currentIndex === stepIndex) return "active";
    return "upcoming";
  };

  const otherDeliveries = allActiveShipments.filter((s) => s.id !== shipment.id);

  // Format real duration if available from backend
  const formatDuration = (mins?: number) => {
    if (typeof mins !== "number" || mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  const formattedEta = formatDuration(shipment.routeDurationMinutes);
  const formattedDistance =
    typeof shipment.routeDistanceKm === "number" && shipment.routeDistanceKm > 0
      ? `${shipment.routeDistanceKm} km`
      : null;

  return (
    <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-1.5rem)] sm:w-[460px] max-w-lg transition-all animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.16)] border border-slate-200/80 p-4 sm:p-5 flex flex-col gap-3.5">
        {/* Top Header: Consumer app style status pill & close */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#005148] text-white flex items-center justify-center text-lg shadow-sm">
              🚚
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                  {currentMeta.label}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentMeta.badgeBg} ${currentMeta.badgeText}`}
                >
                  {backendStatus}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {currentMeta.desc}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseTracking}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Exit tracking mode"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Real Progress Stepper Bar */}
        <div className="py-1 px-1">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-2.5 left-3 right-3 h-0.5 bg-slate-200 -z-0" />
            {steps.map((step) => {
              const state = getStepStatus(step.key);
              return (
                <div key={step.key} className="flex flex-col items-center gap-1.5 z-10">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      state === "completed"
                        ? "bg-[#005148] text-white shadow-xs"
                        : state === "active"
                          ? "bg-white border-2 border-[#005148] text-[#005148] ring-4 ring-emerald-500/20"
                          : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {state === "completed" ? "✓" : state === "active" ? "●" : ""}
                  </div>
                  <span
                    className={`text-[10px] font-semibold ${
                      state === "active"
                        ? "text-[#005148] font-bold"
                        : state === "completed"
                          ? "text-slate-800"
                          : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Route Details Card (Origin ➔ Destination) */}
        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <div className="w-0.5 h-6 bg-slate-300 border-dashed" />
              <span className="text-xs">📍</span>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-baseline gap-1.5 truncate">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">From</span>
                <span className="text-xs font-bold text-slate-800 truncate">{shipment.origin}</span>
              </div>
              <div className="flex items-baseline gap-1.5 truncate">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">To</span>
                <span className="text-xs font-bold text-slate-900 truncate">{shipment.destination}</span>
              </div>
            </div>
          </div>

          {/* Real ETA & Distance (Only displayed if provided by backend data) */}
          {(formattedDistance || formattedEta) && (
            <div className="flex flex-col items-end shrink-0 pl-3 border-l border-slate-200/80">
              {formattedDistance && (
                <div className="text-xs font-black text-slate-900 font-mono">
                  {formattedDistance}
                </div>
              )}
              {formattedEta && (
                <div className="text-[10px] font-bold text-[#005148]">
                  ETA: {formattedEta}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Vehicle & Driver Info Row */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-200/50 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Delivery Vehicle</span>
            <div className="font-extrabold text-slate-900 font-mono mt-0.5 truncate">
              {shipment.vehicleNumber || shipment.vehicleId || "Unassigned"}
            </div>
            {shipment.vehicleType && (
              <span className="text-[10px] text-slate-500 capitalize">{shipment.vehicleType}</span>
            )}
          </div>

          <div className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-200/50 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Driver</span>
            <div className="font-bold text-slate-900 mt-0.5 truncate">
              {shipment.driverName || "Official Driver"}
            </div>
            {shipment.driverPhone && (
              <span className="text-[10px] text-slate-500 font-mono">{shipment.driverPhone}</span>
            )}
          </div>
        </div>

        {/* Consignment metadata footer */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-100">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-mono text-slate-700 font-bold">{shipment.id}</span>
            <span>•</span>
            <span className="truncate">{shipment.commodity}</span>
          </div>

          <button
            type="button"
            onClick={onCloseTracking}
            className="text-[11px] font-bold text-[#003356] hover:text-[#174a73] transition-colors cursor-pointer shrink-0 ml-2"
          >
            View All Active
          </button>
        </div>

        {/* Multi-Delivery Switcher (if multiple active deliveries exist) */}
        {otherDeliveries.length > 0 && onSelectShipment && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0">
              Other Active:
            </span>
            {otherDeliveries.map((other) => (
              <button
                key={other.id}
                type="button"
                onClick={() => onSelectShipment(other.id)}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>🚚</span>
                <span className="font-mono">{other.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
