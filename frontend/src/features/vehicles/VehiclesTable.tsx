import React, { useState, useMemo } from "react";
import { useVehicleStore } from "@/stores/vehicleStore";
import { StatusBadge } from "@/components/common/StatusBadge";

export const VehiclesTable: React.FC = () => {
  const vehicles = useVehicleStore((s) => s.vehicles);
  const selectedVehicleId = useVehicleStore((s) => s.selectedVehicleId);
  const selectVehicle = useVehicleStore((s) => s.selectVehicle);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.id.toLowerCase().includes(search.toLowerCase()) ||
        (v.driverName && v.driverName.toLowerCase().includes(search.toLowerCase())) ||
        (v.currentCorridor && v.currentCorridor.toLowerCase().includes(search.toLowerCase()));

      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "heavy" && v.vehicleType === "heavy") ||
        (typeFilter === "four-wheeler" && v.vehicleType === "four-wheeler") ||
        (typeFilter === "two-wheeler" && v.vehicleType === "two-wheeler");

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "moving" && v.status === "moving") ||
        (statusFilter === "delayed" && v.status === "delayed");

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [vehicles, search, typeFilter, statusFilter]);

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-4">
      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-[#e5e8ee] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#72777f] text-[18px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vehicle ID, operator, corridor..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#f1f4fa] text-[#181c20] text-xs placeholder:text-[#72777f] border border-transparent focus:border-[#174a73] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-[#f1f4fa] text-[#181c20] text-xs font-medium border border-[#e5e8ee] focus:outline-none"
          >
            <option value="ALL">All Types ({vehicles.length})</option>
            <option value="heavy">Heavy Commercial (Truck)</option>
            <option value="four-wheeler">Four Wheeler (Utility)</option>
            <option value="two-wheeler">Two Wheeler (Courier)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-[#f1f4fa] text-[#181c20] text-xs font-medium border border-[#e5e8ee] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="moving">En Route (Moving)</option>
            <option value="delayed">Delayed / Caution</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTypeFilter("ALL");
              setStatusFilter("ALL");
            }}
            title="Reset Filters"
            className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#f1f4fa] text-[#42474e] hover:bg-[#e5e8ee] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Mobile Card Feed (Stitch Mobile 19e4b2f4dfdd4beca6d883b4ad5527bb) */}
      <div className="flex flex-col gap-3 md:hidden">
        {filteredVehicles.map((veh) => {
          const isSelected = selectedVehicleId === veh.id;
          const isDelayed = veh.status === "delayed";
          const typeIcon =
            veh.vehicleType === "heavy"
              ? "local_shipping"
              : veh.vehicleType === "four-wheeler"
              ? "rv_hookup"
              : "two_wheeler";

          return (
            <div
              key={veh.id}
              onClick={() => selectVehicle(veh.id)}
              className={`bg-white rounded-2xl shadow-sm p-4 border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? "border-[#003356] ring-2 ring-[#003356]/20 bg-sky-50/20"
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  isDelayed ? "bg-rose-500" : "bg-[#174a73]"
                }`}
              />

              <div className="flex items-start justify-between gap-2 pt-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                      isDelayed ? "bg-rose-600" : "bg-[#003356]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{typeIcon}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">{veh.id}</span>
                      <span className="text-xs text-slate-500 capitalize">
                        • {veh.vehicleType.replace("-", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {veh.driverName || "Official Driver"} • {veh.currentCorridor || "Guwahati Gateway"}
                    </p>
                  </div>
                </div>

                <StatusBadge type="vehicle" status={veh.status} size="sm" />
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <span className="material-symbols-outlined text-[16px] text-[#27638c]">
                    speed
                  </span>
                  <span>{veh.speedKph} km/h</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 text-[11px] truncate max-w-[140px]">
                    {veh.batteryOrFuelPercent || 85}% fuel/charge
                  </span>
                </div>
                <button
                  type="button"
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#f1f4fa] text-[#003356] hover:bg-[#dfe3e8] transition-colors"
                >
                  {isSelected ? "Inspecting" : "Inspect"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop & Tablet Vehicles Table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#e5e8ee] shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f1f4fa] uppercase text-[11px] text-[#72777f] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Vehicle ID</th>
                <th className="py-3 px-4">Vehicle Type</th>
                <th className="py-3 px-4">Assigned Operator</th>
                <th className="py-3 px-4">Active Corridor</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Speed</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e8ee]">
              {filteredVehicles.map((veh) => {
                const isSelected = selectedVehicleId === veh.id;
                const isDelayed = veh.status === "delayed";

                return (
                  <tr
                    key={veh.id}
                    onClick={() => selectVehicle(veh.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-[#cfe4ff]/30 font-medium" : "hover:bg-[#f8fafc]"
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isDelayed ? "bg-[#dc2626] animate-pulse" : "bg-[#174a73]"
                          }`}
                        />
                        <span className="font-bold text-[#003356]">{veh.id}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#181c20] capitalize">
                      {veh.vehicleType.replace("-", " ")}
                    </td>
                    <td className="py-3.5 px-4 text-[#42474e]">
                      {veh.driverName || "Official Driver"}
                    </td>
                    <td className="py-3.5 px-4 text-[#003356] font-semibold">
                      {veh.currentCorridor || "Guwahati Gateway"}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge type="vehicle" status={veh.status} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#181c20]">
                      {veh.speedKph} km/h
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-[#f1f4fa] hover:bg-[#dfe3e8] text-[#003356] transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
