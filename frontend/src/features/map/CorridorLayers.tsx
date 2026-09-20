import React from "react";
import { Polyline, Tooltip, Popup } from "react-leaflet";
import type { RoadSegment } from "@/types/domain";

interface CorridorLayersProps {
  roads: RoadSegment[];
  isCorridorVisible: (status: string, corridorId?: string) => boolean;
  getRoadStyle: (status: string) => { color: string; weight: number; dashArray?: string };
}

export const CorridorLayers: React.FC<CorridorLayersProps> = ({
  roads,
  isCorridorVisible,
  getRoadStyle
}) => {
  return (
    <>
      {roads.map((road) => {
        if (!isCorridorVisible(road.status, road.id)) return null;
        const style = getRoadStyle(road.status);

        return (
          <React.Fragment key={road.id}>
            {/* Road Casing (White Halo for visual clarity) */}
            <Polyline
              positions={road.geometry}
              pathOptions={{
                color: "#ffffff",
                weight: style.weight + 4,
                lineCap: "round",
                lineJoin: "round",
                opacity: 0.9
              }}
            />
            {/* Primary Road Line */}
            <Polyline
              positions={road.geometry}
              pathOptions={{
                ...style,
                lineCap: "round",
                lineJoin: "round"
              }}
            >
              <Tooltip sticky>
                <div className="font-sans text-xs">
                  <strong className="font-bold text-[#003356]">{road.name}</strong>
                  <div className="text-[11px] text-slate-600">
                    Status: <span className="font-bold capitalize">{road.status.replace("_", " ")}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Speed: {road.speedKph} km/h • Clearance: {road.clearancePercent}
                  </div>
                </div>
              </Tooltip>
              <Popup>
                <div className="p-3 font-sans min-w-[220px]">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-xs text-[#003356]">{road.id}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${
                        road.status === "blocked"
                          ? "bg-rose-100 text-rose-800"
                          : road.status === "at_risk"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {road.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800">{road.name}</p>
                  <p className="text-[11px] text-slate-600 mt-1">{road.description}</p>
                  <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                    <div>
                      Clearance: <strong className="text-slate-700">{road.clearancePercent}</strong>
                    </div>
                    <div>
                      Speed: <strong className="text-slate-700">{road.speedKph} km/h</strong>
                    </div>
                  </div>
                </div>
              </Popup>
            </Polyline>
          </React.Fragment>
        );
      })}
    </>
  );
};
