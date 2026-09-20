import type { DriverProfile } from "@/types/domain";

export const registeredDrivers: DriverProfile[] = [
  {
    id: "DRV-001",
    backendId: "6a9a3c1010f836940a45ab2a",
    name: "R. Boro (Ranjan Boro)",
    phone: "+91 98640 12345",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
    vehicleId: "6a9a3b6510f836940a45ab23",
    backendVehicleId: "6a9a3b6510f836940a45ab23",
    vehicleNumber: "AS-01-AX-1029",
    vehicleType: "Tata Prima 4028.S (Heavy Multi-Axle)",
    status: "available",
    rating: 4.9,
    experienceYears: 8
  },
  {
    id: "DRV-002",
    backendId: "6a9a3c2510f836940a45ab2c",
    name: "T. Sangma (Tarun Sangma)",
    phone: "+91 94361 78921",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    vehicleId: "6a9a3b7a10f836940a45ab25",
    backendVehicleId: "6a9a3b7a10f836940a45ab25",
    vehicleNumber: "ML-05-B-4412",
    vehicleType: "Eicher Pro 2049 (Medical Utility 4x4)",
    status: "available",
    rating: 4.95,
    experienceYears: 6
  },
  {
    id: "DRV-003",
    backendId: "6a9a3c1010f836940a45ab2a",
    name: "K. Das",
    phone: "+91 97740 55432",
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80",
    vehicleId: "6a9a3b6510f836940a45ab23",
    backendVehicleId: "6a9a3b6510f836940a45ab23",
    vehicleNumber: "AS-12-M-0404",
    vehicleType: "Two-Wheeler Urgent Courier",
    status: "available",
    rating: 4.85,
    experienceYears: 4
  },
  {
    id: "DRV-004",
    backendId: "6a9a3c2510f836940a45ab2c",
    name: "P. Gogoi",
    phone: "+91 98540 88712",
    photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&h=256&q=80",
    vehicleId: "6a9a3b7a10f836940a45ab25",
    backendVehicleId: "6a9a3b7a10f836940a45ab25",
    vehicleNumber: "AS-03-BC-9931",
    vehicleType: "Heavy Container Hauler",
    status: "standby",
    rating: 4.88,
    experienceYears: 11
  },
  {
    id: "DRV-005",
    backendId: "6a9a3c1010f836940a45ab2a",
    name: "B. Debbarma",
    phone: "+91 94365 33219",
    photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80",
    vehicleId: "6a9a3b6510f836940a45ab23",
    backendVehicleId: "6a9a3b6510f836940a45ab23",
    vehicleNumber: "TR-01-A-7707",
    vehicleType: "Light Cargo Utility",
    status: "available",
    rating: 4.78,
    experienceYears: 5
  },
  {
    id: "DRV-006",
    backendId: "6a9a3c2510f836940a45ab2c",
    name: "L. Angami",
    phone: "+91 98620 44109",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    vehicleId: "6a9a3b7a10f836940a45ab25",
    backendVehicleId: "6a9a3b7a10f836940a45ab25",
    vehicleNumber: "NL-07-C-1924",
    vehicleType: "All-Terrain Hill Patrol 4WD",
    status: "available",
    rating: 4.92,
    experienceYears: 7
  }
];

export interface RegionalLocation {
  name: string;
  fullName: string;
  state: string;
  coordinates: [number, number]; // [longitude, latitude] GeoJSON
}

export const regionalLocationsRegistry: RegionalLocation[] = [
  {
    name: "Guwahati",
    fullName: "Guwahati Central Logistics Hub (Assam)",
    state: "Assam",
    coordinates: [91.7362, 26.1445]
  },
  {
    name: "Shillong",
    fullName: "Shillong Logistics Hub (Meghalaya)",
    state: "Meghalaya",
    coordinates: [91.8933, 25.5788]
  },
  {
    name: "Itanagar",
    fullName: "Itanagar Capital Depot (Arunachal Pradesh)",
    state: "Arunachal Pradesh",
    coordinates: [93.6167, 27.0844]
  },
  {
    name: "Silchar",
    fullName: "Silchar Arterial Depot (Cachar, Assam)",
    state: "Assam",
    coordinates: [92.7926, 24.8333]
  },
  {
    name: "Jorhat",
    fullName: "Jorhat Regional Hub (Upper Assam)",
    state: "Assam",
    coordinates: [94.2037, 26.7509]
  },
  {
    name: "Dimapur",
    fullName: "Dimapur Gateway Terminal (Nagaland)",
    state: "Nagaland",
    coordinates: [93.7266, 25.9068]
  },
  {
    name: "Kohima",
    fullName: "Kohima State Supply Depot (Nagaland)",
    state: "Nagaland",
    coordinates: [94.1086, 25.6701]
  },
  {
    name: "Tezpur",
    fullName: "Tezpur Transit Depot (Sonitpur, Assam)",
    state: "Assam",
    coordinates: [92.7935, 26.6338]
  },
  {
    name: "Aizawl",
    fullName: "Aizawl Staging Depot (Mizoram)",
    state: "Mizoram",
    coordinates: [92.7176, 23.7271]
  },
  {
    name: "Agartala",
    fullName: "Agartala Integrated Checkpost (Tripura)",
    state: "Tripura",
    coordinates: [91.2868, 23.8315]
  },
  {
    name: "Imphal",
    fullName: "Imphal Regional Medical Depot (Manipur)",
    state: "Manipur",
    coordinates: [93.9368, 24.8170]
  },
  {
    name: "Gangtok",
    fullName: "Gangtok Highland Freight Station (Sikkim)",
    state: "Sikkim",
    coordinates: [88.6138, 27.3389]
  },
  {
    name: "Tawang",
    fullName: "Tawang District Healthcare Post (Arunachal Pradesh)",
    state: "Arunachal Pradesh",
    coordinates: [91.8687, 27.5861]
  },
  {
    name: "Dibrugarh",
    fullName: "Dibrugarh Multi-Modal Railhead (Assam)",
    state: "Assam",
    coordinates: [94.9120, 27.4728]
  },
  {
    name: "Nagaon",
    fullName: "Nagaon Central Crossing (Assam)",
    state: "Assam",
    coordinates: [92.6840, 26.3450]
  },
  {
    name: "Diphu",
    fullName: "Diphu Emergency Depot (Karbi Anglong, Assam)",
    state: "Assam",
    coordinates: [93.4300, 25.8450]
  },
  {
    name: "Pasighat",
    fullName: "Pasighat Relief Depot (Arunachal Pradesh)",
    state: "Arunachal Pradesh",
    coordinates: [95.3300, 28.0600]
  }
];

export const regionalHubLocations = regionalLocationsRegistry.map((l) => l.fullName);
export const regionalDestinations = regionalLocationsRegistry.map((l) => l.fullName);

/**
 * Finds location by flexible text query (case-insensitive, partial matching)
 */
export function findLocationByText(text: string): RegionalLocation | undefined {
  if (!text || !text.trim()) return undefined;
  const clean = text.toLowerCase().trim();

  // 1. Exact match on city name (e.g. "Guwahati", "Shillong")
  const exactName = regionalLocationsRegistry.find(
    (l) => l.name.toLowerCase() === clean
  );
  if (exactName) return exactName;

  // 2. Starts with name or contains name
  const startsWithName = regionalLocationsRegistry.find(
    (l) => clean.startsWith(l.name.toLowerCase()) || l.name.toLowerCase().startsWith(clean)
  );
  if (startsWithName) return startsWithName;

  // 3. Match within full name
  const inFullName = regionalLocationsRegistry.find(
    (l) => l.fullName.toLowerCase().includes(clean) || clean.includes(l.name.toLowerCase())
  );
  if (inFullName) return inFullName;

  return undefined;
}

/**
 * Search locations for autocomplete suggestions
 */
export function searchLocations(query: string): RegionalLocation[] {
  if (!query || !query.trim()) return regionalLocationsRegistry;
  const q = query.toLowerCase().trim();
  return regionalLocationsRegistry.filter(
    (loc) =>
      loc.name.toLowerCase().includes(q) ||
      loc.fullName.toLowerCase().includes(q) ||
      loc.state.toLowerCase().includes(q)
  );
}

/**
 * Reverse geocodes GeoJSON [lng, lat] to closest known location name
 */
export function reverseGeocodeCoordinates(lng: number, lat: number): string {
  if (typeof lng !== "number" || typeof lat !== "number" || isNaN(lng) || isNaN(lat)) {
    return "Unknown Location";
  }

  let closest = regionalLocationsRegistry[0];
  let minDiff = Infinity;

  for (const loc of regionalLocationsRegistry) {
    const diff = Math.hypot(loc.coordinates[0] - lng, loc.coordinates[1] - lat);
    if (diff < minDiff) {
      minDiff = diff;
      closest = loc;
    }
  }

  // If within ~0.2 degrees (~22km), return city name
  if (minDiff <= 0.25) {
    return closest.name;
  }
  return `${closest.name} Vicinity`;
}

export const cargoCommodityPresets = [
  "Critical Vaccines (Cold Chain 2°C - 8°C)",
  "Emergency Relief Rations & Drinking Water",
  "High-Voltage Substation Spares & Transformers",
  "Life-Saving Pharmaceuticals & IV Fluids",
  "Disaster Shelter Kits & Heavy Tarpaulins",
  "Commercial Fast-Moving Consumer Freight"
];
