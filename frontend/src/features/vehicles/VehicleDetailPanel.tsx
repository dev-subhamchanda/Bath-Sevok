import React from "react";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useShipmentStore } from "@/stores/shipmentStore";

export const VehicleDetailPanel: React.FC = () => {
  const selectedVehicleId = useVehicleStore((s) => s.selectedVehicleId);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const shipments = useShipmentStore((s) => s.shipments);

  const vehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
  if (!vehicle) return null;

  const activeShipment = shipments.find((s) => s.id === vehicle.shipmentId);

  return (
    <div className="w-full lg:w-[380px] shrink-0 bg-white rounded-xl border border-[#e5e8ee] p-5 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-[#e5e8ee]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[#003356]">{vehicle.id}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#cfe4ff] text-[#001d34]">
              {vehicle.vehicleType}
            </span>
          </div>
          <p className="text-xs text-[#72777f] mt-0.5">{vehicle.name}</p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
            vehicle.status === "moving"
              ? "bg-[#e6f4ea] text-[#137333]"
              : vehicle.status === "delayed"
              ? "bg-[#ffdad6] text-[#ba1a1a]"
              : "bg-[#ebeef4] text-[#42474e]"
          }`}
        >
          {vehicle.status}
        </span>
      </div>

      {/* Telemetry Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-[#f1f4fa] border border-[#e5e8ee]/70">
          <span className="text-[10px] uppercase font-semibold text-[#72777f]">Current Speed</span>
          <div className="text-xl font-bold text-[#003356] mt-0.5">
            {vehicle.speedKph} <span className="text-xs font-normal text-[#72777f]">km/h</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#f1f4fa] border border-[#e5e8ee]/70">
          <span className="text-[10px] uppercase font-semibold text-[#72777f]">Battery / Fuel</span>
          <div className="text-xl font-bold text-[#005148] mt-0.5">
            {vehicle.batteryOrFuelPercent || 88}%
          </div>
        </div>
      </div>

      {/* Driver & Transit Corridor */}
      <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#f8fafc] border border-[#e5e8ee] text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#72777f]">Assigned Driver:</span>
          <span className="font-semibold text-[#181c20]">{vehicle.driverName || "Official Operator"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#72777f]">Corridor:</span>
          <span className="font-semibold text-[#003356]">{vehicle.currentCorridor || "Assam Network"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#72777f]">GPS Fix:</span>
          <span className="font-mono text-[11px] text-[#42474e]">
            {vehicle.lat.toFixed(4)}°N, {vehicle.lng.toFixed(4)}°E
          </span>
        </div>
      </div>

      {/* Active Consignment */}
      {activeShipment && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-[#eff6ff] border border-[#cfe4ff] text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-[#174a73]">Active Consignment</span>
            <span className="px-1.5 py-0.5 rounded bg-[#174a73] text-white text-[10px] font-bold">
              Priority {activeShipment.priority}
            </span>
          </div>
          <div className="font-semibold text-[#181c20]">{activeShipment.commodity}</div>
          <div className="text-[11px] text-[#42474e]">
            {activeShipment.origin} ➔ {activeShipment.destination}
          </div>
          <div className="w-full bg-[#cbd5e1] h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-[#174a73] h-full transition-all"
              style={{ width: `${activeShipment.progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#72777f]">
            <span>Progress: {activeShipment.progressPercent}%</span>
            <span>ETA: ~2h 15m</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 mt-auto pt-2">
        <button
          type="button"
          onClick={() => alert(`Contacting Driver ${vehicle.driverName || vehicle.id} via Satellite Dispatch link...`)}
          className="w-full h-10 rounded-lg bg-[#f1f4fa] hover:bg-[#dfe3e8] text-[#003356] font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">call</span>
          <span>Contact Driver / Unit</span>
        </button>

        <button
          type="button"
          onClick={() => alert(`Telemetry log downloaded for ${vehicle.id}`)}
          className="w-full h-10 rounded-lg border border-[#e5e8ee] hover:bg-[#f8fafc] text-[#42474e] font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          <span>Export Telemetry Log</span>
        </button>
      </div>
    </div>
  );
};
