import React from "react";
import { useMap } from "react-leaflet";

interface MapFloatingControlsProps {
  onCenterMyLocation: () => void;
  onRecenter: () => void;
  isMyLocationActive: boolean;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export const MapFloatingControls: React.FC<MapFloatingControlsProps> = ({
  onCenterMyLocation,
  onRecenter,
  isMyLocationActive,
  onToggleFullscreen,
  isFullscreen
}) => {
  const map = useMap();

  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex flex-col items-end gap-2 pointer-events-auto">
      <div className="map-floating-element flex flex-col bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_4px_16px_rgba(0,51,86,0.12)] border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          className="p-2.5 sm:p-3 text-slate-700 hover:bg-slate-100 hover:text-[#003356] transition-colors cursor-pointer flex items-center justify-center"
          title="Zoom In (+)"
          aria-label="Zoom In"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          className="p-2.5 sm:p-3 text-slate-700 hover:bg-slate-100 hover:text-[#003356] transition-colors cursor-pointer flex items-center justify-center"
          title="Zoom Out (−)"
          aria-label="Zoom Out"
        >
          <span className="material-symbols-outlined text-[20px]">remove</span>
        </button>
        <button
          type="button"
          onClick={onCenterMyLocation}
          className={`p-2.5 sm:p-3 transition-colors cursor-pointer flex items-center justify-center ${
            isMyLocationActive
              ? "bg-sky-50 text-[#0284c7] font-bold"
              : "text-slate-700 hover:bg-slate-100 hover:text-[#0284c7]"
          }`}
          title="Center on My Location (Live GPS)"
          aria-label="My Location"
        >
          <span className="material-symbols-outlined text-[20px]">my_location</span>
        </button>
        <button
          type="button"
          onClick={onRecenter}
          className="p-2.5 sm:p-3 text-slate-700 hover:bg-slate-100 hover:text-[#003356] transition-colors cursor-pointer flex items-center justify-center"
          title="Recenter North East Region"
          aria-label="Recenter Map"
        >
          <span className="material-symbols-outlined text-[20px]">filter_center_focus</span>
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className={`p-2.5 sm:p-3 transition-colors cursor-pointer flex items-center justify-center ${
            isFullscreen
              ? "bg-[#003356] text-white hover:bg-[#174a73]"
              : "text-slate-700 hover:bg-slate-100 hover:text-[#003356]"
          }`}
          title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand Map Fullscreen"}
          aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isFullscreen ? "fullscreen_exit" : "fullscreen"}
          </span>
        </button>
      </div>
    </div>
  );
};
