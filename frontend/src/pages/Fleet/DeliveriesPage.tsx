import React, { useState, useEffect, useCallback } from "react";
import { ConsignmentsTable } from "@/features/routes/ConsignmentsTable";
import { RouteComparisonPanel } from "@/features/routes/RouteComparisonPanel";
import { CreateShipmentModal } from "@/features/routes/CreateShipmentModal";
import { KpiCard } from "@/components/common/KpiCard";
import { useShipmentStore } from "@/stores/shipmentStore";
import { shipmentApi } from "@/services/api/apiClient";

export const DeliveriesPage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const shipments = useShipmentStore((s) => s.shipments);
  const setShipments = useShipmentStore((s) => s.setShipments);
  const selectShipment = useShipmentStore((s) => s.selectShipment);

  const loadShipments = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const list = await shipmentApi.getAll();
      if (list && list.length > 0) {
        setShipments(list);
      }
    } catch (err) {
      console.warn("Could not fetch shipments from backend on DeliveriesPage:", err);
      setFetchError("Unable to load latest shipments from backend. Displaying offline snapshot.");
    } finally {
      setIsLoading(false);
    }
  }, [setShipments]);

  useEffect(() => {
    let active = true;
    shipmentApi.getAll()
      .then((list) => {
        if (active && list && list.length > 0) {
          setShipments(list);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch shipments from backend on DeliveriesPage:", err);
        if (active) {
          setFetchError("Unable to load latest shipments from backend. Displaying offline snapshot.");
        }
      });

    return () => {
      active = false;
    };
  }, [setShipments]);

  const atRiskCount = shipments.filter((s) => s.status === "at_risk").length;
  const onTimeCount = shipments.filter((s) => s.status === "on_time").length;
  const deliveredCount = shipments.filter((s) => s.status === "delivered").length;
  const highPriorityCount = shipments.filter((s) => s.priority === 1).length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1440px] mx-auto pb-12">
      {/* Page Header & Metrics Summary */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#cfe4ff] text-[#001d34] text-[11px] font-semibold uppercase tracking-wider">
                Freight & Consignments
              </span>
              <span className="text-[#72777f] text-xs">•</span>
              <span className="text-xs text-[#72777f]">
                <span className="sm:hidden">Corridor Dispatches</span>
                <span className="hidden sm:inline">North East Arterial Corridors (Assam, Meghalaya, Arunachal)</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#003356] tracking-tight">
              Deliveries & Consignment Operations
            </h1>
            <p className="text-xs sm:text-sm text-[#42474e] max-w-3xl">
              Track multi-modal shipments, monitor high-priority medical and relief consignments, and inspect dynamic route detour recommendations.
            </p>
          </div>

          {/* Header Actions: Create Shipment CTA + Metrics */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-[#003356] hover:bg-[#174a73] text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Create Shipment</span>
            </button>
            <KpiCard
              compact
              icon="inventory_2"
              iconColor="text-[#27638c]"
              value={shipments.length}
              unit="Total"
              label="Consignments"
            />
            <KpiCard
              compact
              icon="check_circle"
              iconColor="text-[#005148]"
              value={onTimeCount}
              unit="On Schedule"
              label="On Schedule"
            />
            <KpiCard
              compact
              icon="warning"
              iconColor="text-[#ba1a1a]"
              value={atRiskCount}
              unit="At Risk"
              label="At Risk"
            />
            <KpiCard
              compact
              icon="emergency"
              iconColor="text-[#d97706]"
              value={highPriorityCount}
              unit="Priority 1"
              label="Priority 1"
            />
          </div>
        </div>

        {/* Live Corridor Status Indicator */}
        <div className="flex items-center justify-between bg-[#f1f4fa] px-4 py-2 rounded-xl border border-[#e5e8ee] text-xs text-[#42474e]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#005148] animate-pulse" />
            <span className="font-semibold text-[#181c20]">Dynamic Route Re-calculation:</span>
            <span>Real-time ETA adjustments active for weather and road clearance events</span>
          </div>
          <span className="hidden sm:inline text-[11px] text-[#72777f]">
            {deliveredCount} completed deliveries this shift
          </span>
        </div>
        {/* Loading / Error Indicators */}
        {fetchError && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">info</span>
              <span>{fetchError}</span>
            </div>
            <button
              type="button"
              onClick={loadShipments}
              className="text-xs font-semibold text-amber-900 underline hover:no-underline cursor-pointer shrink-0 ml-3"
            >
              Retry Sync
            </button>
          </div>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-800 px-4 py-2.5 rounded-xl text-xs animate-pulse">
            <span className="material-symbols-outlined text-[18px] text-sky-600 animate-spin shrink-0">sync</span>
            <span>Syncing consignments from backend...</span>
          </div>
        )}
      </div>

      {/* Main Split Layout: Consignments Table + Route Comparison */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        <ConsignmentsTable onOpenCreateModal={() => setIsCreateModalOpen(true)} />
        <RouteComparisonPanel />
      </div>

      {/* Create Consignment Modal */}
      <CreateShipmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(id) => {
          loadShipments();
          selectShipment(id);
        }}
      />
    </div>
  );
};
