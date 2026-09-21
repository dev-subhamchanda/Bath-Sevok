import React from "react";
import { Marker, Popup } from "react-leaflet";
import type { Vehicle } from "@/types/domain";
import { createVehicleIcon } from "./mapMarkerIcons";

interface VehicleMapMarkersProps {
  vehicles: Vehicle[];
  isVehicleVisible: (vehicleId: string, vehicleName: string) => boolean;
  isNh6Blocked: boolean;
}

export const VehicleMapMarkers: React.FC<VehicleMapMarkersProps> = ({
  vehicles,
  isVehicleVisible,
  isNh6Blocked
}) => {
  return (
    <>
      {vehicles.map((v) => {
        if (!isVehicleVisible(v.id, v.name)) return null;
        const isBlocked = isNh6Blocked && v.id === "FW-18";

        return (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={createVehicleIcon(v.id, isBlocked)}
          >
            <Popup>
              <div className="p-3 font-sans min-w-[220px]">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold text-xs text-[#003356] font-mono">{v.id}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${isBlocked
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800"
                      }`}
                  >
                    {isBlocked ? "Halted (Cutoff)" : v.status}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800">{v.name}</p>
                <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px] text-slate-600">
                  <div>
                    Operator: <strong className="text-slate-800">{v.driverName || "Official Driver"}</strong>
                  </div>
                  <div>
                    Speed: <strong className="text-slate-800">{v.speedKph} km/h</strong>
                  </div>
                  <div>
                    Corridor: <span className="text-slate-700 font-medium">{v.currentCorridor || "Assam Arterial"}</span>
                  </div>
                  <div>
                    Cargo: <span className="text-slate-700 capitalize">{v.cargoType} payload</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};
