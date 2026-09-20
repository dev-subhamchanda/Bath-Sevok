import React from "react";
import { Marker, Popup } from "react-leaflet";
import type { Incident } from "@/types/domain";
import { createIncidentIcon } from "./mapMarkerIcons";

interface IncidentMapMarkersProps {
  incidents: Incident[];
}

export const IncidentMapMarkers: React.FC<IncidentMapMarkersProps> = ({ incidents }) => {
  return (
    <>
      {incidents.map((inc) => (
        <Marker
          key={inc.id}
          position={[inc.lat, inc.lng]}
          icon={createIncidentIcon(inc.severity, inc.type)}
        >
          <Popup>
            <div className="p-3 font-sans min-w-[240px] max-w-xs">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-bold text-xs text-[#003356]">{inc.id}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                    inc.severity === "high"
                      ? "bg-rose-100 text-rose-800"
                      : inc.severity === "medium"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {inc.severity} severity
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 leading-snug">{inc.title}</h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{inc.description}</p>
              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-0.5 text-[10px] text-slate-500">
                <div>
                  Agency: <strong className="text-slate-700">{inc.agency}</strong>
                </div>
                <div>
                  Corridor: <strong className="text-slate-700">{inc.corridorName}</strong>
                </div>
                {inc.impact && <div className="text-rose-700 font-medium">{inc.impact}</div>}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};
