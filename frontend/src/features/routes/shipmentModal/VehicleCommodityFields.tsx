import React from "react";
import { registeredDrivers, cargoCommodityPresets } from "@/services/mock/driversData";

interface VehicleCommodityFieldsProps {
  shipmentId: string;
  onNewShipmentId: () => void;
  onShipmentIdChange: (val: string) => void;
  commodity: string;
  onCommodityChange: (val: string) => void;
  weightKg: number;
  onWeightKgChange: (val: number) => void;
  priority: 1 | 2 | 3;
  onPriorityChange: (val: 1 | 2 | 3) => void;
  selectedVehicleId: string;
  onVehicleIdChange: (val: string) => void;
  selectedVehicleInfo: { vehicleNumber: string; vehicleType: string };
}

export const VehicleCommodityFields: React.FC<VehicleCommodityFieldsProps> = ({
  shipmentId,
  onNewShipmentId,
  onShipmentIdChange,
  commodity,
  onCommodityChange,
  weightKg,
  onWeightKgChange,
  priority,
  onPriorityChange,
  selectedVehicleId,
  onVehicleIdChange,
  selectedVehicleInfo
}) => {
  return (
    <>
      {/* Consignment ID, Commodity, Weight */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        {/* Consignment ID */}
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#181c20]">Consignment ID</label>
            <button
              type="button"
              onClick={onNewShipmentId}
              className="text-[10px] text-[#174a73] hover:underline flex items-center gap-0.5 cursor-pointer"
              title="Generate new ID"
            >
              <span className="material-symbols-outlined text-[13px]">refresh</span>
              <span>New ID</span>
            </button>
          </div>
          <input
            type="text"
            required
            value={shipmentId}
            onChange={(e) => onShipmentIdChange(e.target.value)}
            placeholder="e.g. SHP-2026-089"
            className="w-full h-10 px-3 rounded-xl bg-[#f1f4fa] text-xs font-mono font-semibold text-[#003356] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        {/* Cargo / Shipment Type */}
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#181c20]">Cargo / Commodity Type</label>
          <select
            value={commodity}
            onChange={(e) => onCommodityChange(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[#f1f4fa] text-xs font-medium text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none transition-colors"
          >
            {cargoCommodityPresets.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Consignment Weight (kg) */}
        <div className="sm:col-span-1 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#181c20]">Weight (kg)</label>
          <input
            type="number"
            min={10}
            max={40000}
            required
            value={weightKg}
            onChange={(e) => onWeightKgChange(Math.max(1, Number(e.target.value)))}
            placeholder="1200"
            className="w-full h-10 px-3 rounded-xl bg-[#f1f4fa] text-xs font-semibold text-[#003356] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Priority Ribbon */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-[#181c20]">Dispatch Priority</label>
        <div className="grid grid-cols-3 gap-2 p-1 bg-[#f1f4fa] rounded-xl border border-[#e5e8ee]">
          {[
            { level: 1, label: "P1 — Emergency", sub: "Critical Vaccines / Medical", color: "bg-[#ffdad6] text-[#ba1a1a]" },
            { level: 2, label: "P2 — Essential", sub: "Food & Grid Hardware", color: "bg-[#ffedd5] text-[#c2410c]" },
            { level: 3, label: "P3 — Standard", sub: "Commercial Freight", color: "bg-[#cfe4ff] text-[#001d34]" }
          ].map((p) => {
            const isSelected = priority === p.level;
            return (
              <button
                key={p.level}
                type="button"
                onClick={() => onPriorityChange(p.level as 1 | 2 | 3)}
                className={`py-2 px-2.5 text-left rounded-lg transition-all cursor-pointer flex flex-col gap-0.5 ${
                  isSelected
                    ? "bg-white shadow-sm ring-2 ring-[#003356]/20 font-bold"
                    : "text-[#42474e] hover:bg-white/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#181c20]">{p.label}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-[#003356]" />}
                </div>
                <span className="text-[10px] text-[#72777f] truncate">{p.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vehicle Selection Sync */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#181c20]">Vehicle Unit Selection</label>
          <select
            value={selectedVehicleId}
            onChange={(e) => onVehicleIdChange(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[#f1f4fa] text-xs font-semibold text-[#003356] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none"
          >
            {registeredDrivers.map((d) => (
              <option key={d.id} value={d.backendVehicleId || d.vehicleId}>
                {d.vehicleNumber} — {d.vehicleType}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#181c20]">Transit Fleet Classification</label>
          <div className="h-10 px-3 rounded-xl bg-[#f1f4fa] flex items-center justify-between text-xs text-[#42474e] border border-[#e5e8ee]">
            <span className="font-semibold text-[#003356]">{selectedVehicleInfo.vehicleType}</span>
            <span className="text-[10px] font-mono text-[#72777f]">{selectedVehicleInfo.vehicleNumber}</span>
          </div>
        </div>
      </div>
    </>
  );
};
