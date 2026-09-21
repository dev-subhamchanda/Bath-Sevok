import React, { useState, useEffect, useCallback } from "react";
import { VehiclesTable } from "@/features/vehicles/VehiclesTable";
import { VehicleDetailPanel } from "@/features/vehicles/VehicleDetailPanel";
import { ConsignmentsTable } from "@/features/routes/ConsignmentsTable";
import { RouteComparisonPanel } from "@/features/routes/RouteComparisonPanel";
import { CreateShipmentModal } from "@/features/routes/CreateShipmentModal";
import { KpiCard } from "@/components/common/KpiCard";
import { useVehicleStore } from "@/stores/vehicleStore";
import { useShipmentStore } from "@/stores/shipmentStore";
import { shipmentApi } from "@/services/api/apiClient";

export const FleetPage: React.FC<{ initialTab?: "vehicles" | "deliveries" }> = ({
  initialTab = "vehicles"
}) => {
  const [activeTab, setActiveTab] = useState<"vehicles" | "deliveries">(initialTab);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const shipments = useShipmentStore((s) => s.shipments);
  const setShipments = useShipmentStore((s) => s.setShipments);
  const selectShipment = useShipmentStore((s) => s.selectShipment);

  const loadShipments = useCallback(async () => {
    try {
      const list = await shipmentApi.getAll();
      setShipments(list);
    } catch (err) {
      console.warn("Could not fetch shipments on FleetPage:", err);
    }
  }, [setShipments]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page Header & Metrics Summary Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#cfe4ff] text-[#001d34] text-[11px] font-semibold uppercase tracking-wider">
                Fleet & Telematics
              </span>
              <span className="text-[#72777f] text-xs">•</span>
              <span className="text-xs text-[#72777f]">
                <span className="sm:hidden">Sector 4</span>
                <span className="hidden sm:inline">Sector 4 (Arunachal & Upper Assam)</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#003356] tracking-tight">
              <span className="sm:hidden">Fleet & Consignments</span>
              <span className="hidden sm:inline">Fleet & Consignment Management</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#42474e] max-w-3xl">
              <span className="sm:hidden">Unified telematics and consignment tracking.</span>
              <span className="hidden sm:inline">Unified telemetry, vehicle diagnostics, and consignment tracking across North Eastern transit corridors.</span>
            </p>
          </div>

          {/* Quick Summary Metric Pills */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <KpiCard
              compact
              icon="local_shipping"
              iconColor="text-[#003356]"
              value={vehicles.length || 148}
              unit="Units"
              label="Fleet"
            />
            <KpiCard
              compact
              icon="inventory_2"
              iconColor="text-[#27638c]"
              value={shipments.length}
              unit="Consignments"
              label="Consignments"
            />
            <KpiCard
              compact
              icon="warning"
              iconColor="text-[#ba1a1a]"
              value={4}
              unit="At-Risk"
              label="At-Risk"
            />
            <KpiCard
              compact
              icon="wifi_off"
              iconColor="text-[#72777f]"
              value={2}
              unit="Radio Offline"
              label="Radio Offline"
            />
          </div>
        </div>

        {/* Dual Tab Selector */}
        <div className="flex items-center justify-between bg-[#f1f4fa] p-1 rounded-xl border border-[#e5e8ee]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("vehicles")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === "vehicles"
                  ? "bg-[#003356] text-white shadow-xs"
                  : "text-[#42474e] hover:bg-[#ebeef4] hover:text-[#181c20]"
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">commute</span>
              <span>Vehicles</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === "vehicles" ? "bg-white text-[#003356]" : "bg-[#ebeef4] text-[#72777f]"
                  }`}
              >
                {vehicles.length || 148}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("deliveries")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === "deliveries"
                  ? "bg-[#003356] text-white shadow-xs"
                  : "text-[#42474e] hover:bg-[#ebeef4] hover:text-[#181c20]"
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">local_mall</span>
              <span className="sm:hidden">Deliveries</span>
              <span className="hidden sm:inline">Deliveries (Consignments)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === "deliveries" ? "bg-white text-[#003356]" : "bg-[#ebeef4] text-[#72777f]"
                  }`}
              >
                {shipments.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 text-[#42474e] text-xs pr-1">
              <span className="w-2 h-2 rounded-full bg-[#005148] animate-ping" />
              <span>Telemetry: 3.5s cycle</span>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg bg-[#003356] hover:bg-[#174a73] text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Create new shipment consignment"
            >
              <span className="material-symbols-outlined text-[17px]">add_circle</span>
              <span>Create Shipment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {activeTab === "vehicles" ? (
          <>
            <VehiclesTable />
            <VehicleDetailPanel />
          </>
        ) : (
          <>
            <ConsignmentsTable
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              liveOnly
            />
            <RouteComparisonPanel />
          </>
        )}
      </div>

      {/* Create Consignment Modal */}
      <CreateShipmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(id) => {
          loadShipments();
          selectShipment(id);
          setActiveTab("deliveries");
        }}
      />
    </div>
  );
};
