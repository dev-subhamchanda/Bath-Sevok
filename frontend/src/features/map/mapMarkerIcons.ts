import L from "leaflet";

/**
 * Custom Leaflet HTML DivIcon generators for NER GIS Cartography.
 */

export const createVehicleIcon = (id: string, isBlocked?: boolean): L.DivIcon => {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
        ${
          isBlocked
            ? '<span class="absolute w-8 h-8 rounded-full bg-rose-500/40 animate-ping"></span>'
            : '<span class="absolute w-7 h-7 rounded-full bg-emerald-500/25 animate-ping"></span>'
        }
        <div class="flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[10px] font-bold shadow-md border-2 border-white transition-transform group-hover:scale-110 select-none ${
          isBlocked ? "bg-[#ba1a1a]" : "bg-[#003356]"
        }">
          <span class="material-symbols-outlined text-[13px]">local_shipping</span>
          <span class="font-mono">${id}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

export const createIncidentIcon = (severity: "high" | "medium" | "low", type: string): L.DivIcon => {
  const bg = severity === "high" ? "#dc2626" : severity === "medium" ? "#d97706" : "#2563eb";
  const icon = type === "landslide" ? "landslide" : type === "flood" ? "water_damage" : "warning";
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
        <span class="absolute w-8 h-8 rounded-full ${
          severity === "high" ? "bg-rose-500/40 animate-ping" : "bg-amber-500/30"
        }"></span>
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white transition-transform group-hover:scale-110 select-none" style="background-color: ${bg};">
          <span class="material-symbols-outlined text-[15px]">${icon}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

export const createEndpointIcon = (label: string, isOrigin: boolean): L.DivIcon => {
  const bg = isOrigin ? "#15803d" : "#003356";
  const icon = isOrigin ? "warehouse" : "local_hospital";
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-white text-[10px] font-bold shadow-lg border-2 border-white transition-transform group-hover:scale-105 select-none" style="background-color: ${bg};">
          <span class="material-symbols-outlined text-[14px]">${icon}</span>
          <span>${label}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

export const createLiveUserGpsIcon = (): L.DivIcon => {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
        <span class="absolute w-8 h-8 rounded-full bg-sky-400/40 animate-ping"></span>
        <div class="w-4 h-4 rounded-full bg-[#0284c7] border-2 border-white shadow-md"></div>
        <div class="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-[#0284c7] text-white text-[9px] font-bold shadow-sm">
          ● You (Live)
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

/**
 * Consumer-style Delivery Vehicle Marker (Inspired by Rapido, Zomato, Blinkit)
 * Features a distinct delivery vehicle badge, vehicle plate number, driver label, and active tracking pulse.
 */
export const createConsumerDeliveryVehicleIcon = (
  vehiclePlate: string,
  driverName?: string,
  isTrackingSelected?: boolean
): L.DivIcon => {
  const displayPlate = vehiclePlate || "Delivery Unit";
  return L.divIcon({
    className: "consumer-vehicle-marker",
    html: `
      <div class="relative flex flex-col items-center cursor-pointer select-none" style="transform: translate(-50%, -100%);">
        ${
          isTrackingSelected
            ? '<span class="absolute -top-1 w-11 h-11 rounded-full bg-emerald-500/30 animate-ping"></span>'
            : ""
        }
        <div class="relative flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white text-slate-900 shadow-[0_4px_16px_rgba(0,0,0,0.18)] border-2 ${
          isTrackingSelected ? "border-[#005148] ring-4 ring-emerald-500/25 scale-105" : "border-slate-200 hover:scale-105"
        } transition-all">
          <div class="w-7 h-7 rounded-xl ${
            isTrackingSelected ? "bg-[#005148] text-white" : "bg-slate-100 text-slate-800"
          } flex items-center justify-center text-sm shadow-xs font-bold">
            🚚
          </div>
          <div class="flex flex-col text-left">
            <span class="font-extrabold text-[11px] text-slate-900 font-mono tracking-tight leading-tight">${displayPlate}</span>
            ${
              driverName
                ? `<span class="text-[9px] text-slate-500 font-semibold leading-tight truncate max-w-[90px]">${driverName}</span>`
                : `<span class="text-[9px] text-emerald-700 font-bold leading-tight uppercase tracking-wider">Active</span>`
            }
          </div>
        </div>
        <div class="w-2.5 h-2.5 bg-white border-r-2 border-b-2 ${
          isTrackingSelected ? "border-[#005148]" : "border-slate-200"
        } rotate-45 -mt-1.5 shadow-xs"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

/**
 * Consumer-style Destination Pin Marker (Inspired by Rapido, Zomato, Blinkit)
 * Clean, modern drop-off pin with destination city name.
 */
export const createConsumerDestinationIcon = (
  destinationCity: string,
  isTrackingSelected?: boolean
): L.DivIcon => {
  const city = destinationCity || "Destination";
  return L.divIcon({
    className: "consumer-destination-marker",
    html: `
      <div class="relative flex flex-col items-center cursor-pointer select-none" style="transform: translate(-50%, -100%);">
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900 text-white shadow-[0_4px_16px_rgba(0,0,0,0.22)] border-2 ${
          isTrackingSelected ? "border-rose-500 ring-4 ring-rose-500/25 scale-105" : "border-slate-700 hover:scale-105"
        } transition-all">
          <span class="text-xs">📍</span>
          <span class="font-bold text-[11px] tracking-tight leading-tight">${city}</span>
        </div>
        <div class="w-2.5 h-2.5 bg-slate-900 border-r-2 border-b-2 ${
          isTrackingSelected ? "border-rose-500" : "border-slate-700"
        } rotate-45 -mt-1.5 shadow-xs"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};
