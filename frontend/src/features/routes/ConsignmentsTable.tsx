import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useShipmentStore } from "@/stores/shipmentStore";
import { initialShipments } from "@/services/mock/seedData";
import { StatusBadge } from "@/components/common/StatusBadge";

interface ConsignmentsTableProps {
  onOpenCreateModal?: () => void;
  liveOnly?: boolean;
}

export const ConsignmentsTable: React.FC<ConsignmentsTableProps> = ({ onOpenCreateModal, liveOnly = false }) => {
  const navigate = useNavigate();
  const shipments = useShipmentStore((s) => s.shipments);
  const selectedShipmentId = useShipmentStore((s) => s.selectedShipmentId);
  const selectShipment = useShipmentStore((s) => s.selectShipment);

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const effectiveShipments = liveOnly ? shipments : shipments.length > 0 ? shipments : initialShipments;

  const trackShipment = (event: React.MouseEvent, shipmentId: string) => {
    event.stopPropagation();
    selectShipment(shipmentId);
    navigate("/dashboard");
  };

  const filteredShipments = useMemo(() => {
    return effectiveShipments.filter((s) => {
      const matchesSearch =
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        s.commodity.toLowerCase().includes(search.toLowerCase()) ||
        s.origin.toLowerCase().includes(search.toLowerCase()) ||
        s.destination.toLowerCase().includes(search.toLowerCase()) ||
        (s.driverName && s.driverName.toLowerCase().includes(search.toLowerCase()));

      const matchesPriority =
        priorityFilter === "ALL" || s.priority.toString() === priorityFilter;

      const matchesStatus =
        statusFilter === "ALL" || s.status === statusFilter;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [effectiveShipments, search, priorityFilter, statusFilter]);

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
            placeholder="Search consignment, driver, city..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#f1f4fa] text-[#181c20] text-xs placeholder:text-[#72777f] border border-transparent focus:border-[#174a73] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-[#f1f4fa] text-[#181c20] text-xs font-medium border border-[#e5e8ee] focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="1">Priority 1 (Critical Medical/Vaccines)</option>
            <option value="2">Priority 2 (Food / Grid Infrastructure)</option>
            <option value="3">Priority 3 (General Commercial)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-[#f1f4fa] text-[#181c20] text-xs font-medium border border-[#e5e8ee] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="on_time">On-Time</option>
            <option value="at_risk">At Risk</option>
            <option value="delayed">Delayed</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setPriorityFilter("ALL");
              setStatusFilter("ALL");
            }}
            title="Reset Filters"
            className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#f1f4fa] text-[#42474e] hover:bg-[#e5e8ee] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>

          {onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="h-10 px-3.5 rounded-lg bg-[#003356] hover:bg-[#174a73] text-white text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">add_circle</span>
              <span>New Shipment</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Consignment Card Feed */}
      <div className="flex flex-col gap-3 md:hidden">
        {filteredShipments.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-slate-400">inventory_2</span>
            <p className="text-xs font-semibold text-slate-700">No consignments found</p>
            <p className="text-[11px] text-slate-400">Try adjusting your filters or dispatch a new consignment.</p>
          </div>
        ) : (
          filteredShipments.map((shp) => {
            const isSelected = selectedShipmentId === shp.id;
          const isAtRisk = shp.status === "at_risk" || shp.status === "delayed";

          return (
            <div
              key={shp.id}
              onClick={() => selectShipment(shp.id)}
              className={`bg-white rounded-2xl shadow-sm p-4 border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? "border-[#003356] ring-2 ring-[#003356]/20 bg-sky-50/20"
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  isAtRisk ? "bg-amber-500" : "bg-[#005148]"
                }`}
              />

              <div className="flex items-start justify-between gap-2 pt-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{shp.id}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        shp.priority === 1
                          ? "bg-rose-100 text-rose-800"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      P{shp.priority}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-800 mt-0.5">{shp.commodity}</h3>
                  <p className="text-[11px] text-slate-500">
                    {shp.origin} ➔ {shp.destination}
                  </p>
                  {shp.driverName && (
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-700">
                      {shp.driverPhotoUrl ? (
                        <img
                          src={shp.driverPhotoUrl}
                          alt={shp.driverName}
                          className="w-4 h-4 rounded-full object-cover border border-[#003356]/20 shrink-0"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-[13px] text-[#27638c]">person</span>
                      )}
                      <span className="font-semibold text-[#003356]">{shp.driverName}</span>
                      {shp.vehicleNumber && (
                        <span className="text-[10px] text-slate-500 font-mono">({shp.vehicleNumber})</span>
                      )}
                    </div>
                  )}
                </div>

                <StatusBadge type="consignment" status={shp.status} size="sm" />
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-[#174a73]"
                      style={{ width: `${shp.progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-600">
                    {shp.progressPercent}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(event) => trackShipment(event, shp.id)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#005148] text-white hover:bg-[#003d36] transition-colors"
                >
                  Track
                </button>
              </div>
            </div>
          );
        })
      )}
      </div>

      {/* Desktop & Tablet Consignments Data Table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#e5e8ee] shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f1f4fa] uppercase text-[11px] text-[#72777f] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Consignment ID</th>
                <th className="py-3 px-4">Commodity & Route</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Route Risk</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Route Compare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e8ee]">
<<<<<<< HEAD
              {filteredShipments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-xs text-[#72777f]">
                    <span className="material-symbols-outlined block text-3xl text-[#9aa1aa] mb-2">inventory_2</span>
                    No live consignments match the current filters.
                  </td>
                </tr>
              )}
              {filteredShipments.map((shp) => {
=======
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <span className="material-symbols-outlined text-4xl text-slate-400">inventory_2</span>
                      <p className="text-sm font-semibold text-slate-700">No consignments found</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        No shipments match the selected filter criteria or no active shipments have been dispatched yet.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredShipments.map((shp) => {
>>>>>>> 1cf65897f23963638a35b6830d15f0318b67ed1e
                const isSelected = selectedShipmentId === shp.id;

                return (
                  <tr
                    key={shp.id}
                    onClick={() => selectShipment(shp.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-[#cfe4ff]/30 font-medium" : "hover:bg-[#f8fafc]"
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#003356]">{shp.id}</span>
                      </div>
                      {shp.driverName && (
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#42474e]">
                          {shp.driverPhotoUrl ? (
                            <img
                              src={shp.driverPhotoUrl}
                              alt={shp.driverName}
                              className="w-4 h-4 rounded-full object-cover border border-[#003356]/20 shrink-0"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-[13px] text-[#27638c]">person</span>
                          )}
                          <span className="font-medium text-[#003356]">{shp.driverName}</span>
                          {shp.vehicleNumber && (
                            <span className="text-[10px] text-slate-500 font-mono">({shp.vehicleNumber})</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#181c20]">{shp.commodity}</div>
                      <div className="text-[11px] text-[#72777f]">
                        {shp.origin} ➔ {shp.destination}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          shp.priority === 1
                            ? "bg-[#ffdad6] text-[#ba1a1a]"
                            : "bg-[#cfe4ff] text-[#001d34]"
                        }`}
                      >
                        P{shp.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-[#e5e8ee] overflow-hidden">
                          <div
                            className="h-full bg-[#174a73]"
                            style={{ width: `${shp.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-[#42474e]">
                          {shp.progressPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold ${
                          shp.riskScore > 0.5 ? "text-[#ba1a1a]" : "text-[#15803D]"
                        }`}
                      >
                        {Math.round(shp.riskScore * 100)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge type="consignment" status={shp.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(event) => trackShipment(event, shp.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-[#005148] hover:bg-[#003d36] text-white transition-colors cursor-pointer"
                      >
                        Track
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
