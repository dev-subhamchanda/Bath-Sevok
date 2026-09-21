export type AccessibilityStatus = "accessible" | "at_risk" | "blocked" | "under_observation";
export type Severity = "low" | "medium" | "high";
export type AlertSeverity = "info" | "warning" | "critical";
export type UserRole = "admin" | "operator" | "officer";

export interface RoadSegment {
  id: string;
  name: string;
  geometry: [number, number][];       // [lat, lng] polyline points
  roadType: "national_highway" | "state_highway" | "district_road" | "railway" | "waterway";
  status: AccessibilityStatus;
  accessibilityScore: number;         // 0-100
  floodRisk: number;                  // 0-1
  landslideRisk: number;              // 0-1
  trafficLevel: "low" | "medium" | "high";
  speedKph?: number;
  clearancePercent?: string;
  sector?: string;
  description?: string;
  lastUpdated: string;                // ISO timestamp
  confidence: number;                 // 0-1
  source: string;                     // "weather" | "field_report" | "seed" | "mock"
}

export interface Vehicle {
  id: string;
  name: string;
  cargoType: "medical" | "food" | "construction" | "general";
  vehicleType: "heavy" | "four-wheeler" | "two-wheeler";
  driverName?: string;
  lat: number;
  lng: number;
  speedKph: number;
  headingDeg: number;
  status: "moving" | "idle" | "delayed" | "stopped";
  currentRouteId?: string;
  currentCorridor?: string;
  shipmentId?: string;
  cargoDescription?: string;
  etaIso?: string;
  delayMinutes?: number;
  batteryOrFuelPercent?: number;
  riskScore?: number;                 // 0-1
  lastUpdated: string;
}

export interface Incident {
  id: string;
  type: "flood" | "landslide" | "road_blocked" | "accident" | "bridge_damage" | "traffic" | "other";
  severity: Severity;
  lat: number;
  lng: number;
  title: string;
  affectedRoadId?: string;
  corridorName?: string;
  description: string;
  photoUrl?: string;
  reportedBy?: string;
  agency?: string;
  impact?: string;
  createdAt: string;
  status: "pending" | "verified" | "resolved";
  syncStatus?: "synced" | "pending_sync";   // for simulated offline flow (FR-14)
}

export type NewIncidentInput = Omit<Incident, "id" | "createdAt" | "status" | "syncStatus">;

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  photoUrl: string;
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  status: "available" | "in_transit" | "standby";
  rating?: number;
  experienceYears?: number;
  backendId?: string;
  backendVehicleId?: string;
}

export interface Shipment {
  id: string;
  origin: string;
  destination: string;
  vehicleId: string;
  priority: 1 | 2 | 3;                // 1 = highest, e.g. medicine
  commodity: string;
  progressPercent: number;
  etaIso: string;
  status: "on_time" | "at_risk" | "delayed" | "delivered";
  currentRouteId: string;
  riskScore: number;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverPhotoUrl?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  pickupTimeIso?: string;
  expectedDeliveryIso?: string;
  receiverContact?: string;
  specialInstructions?: string;
  originCoordinates?: [number, number]; // [longitude, latitude] GeoJSON
  destinationCoordinates?: [number, number]; // [longitude, latitude] GeoJSON
  trackingNumber?: string;
  weightKg?: number;
  rawBackendId?: string;
  backendStatus?: string;
  routeGeometry?: [number, number][];
  routeDistanceKm?: number;
  routeDurationMinutes?: number;
  createdAt?: string;
}

export interface RouteOption {
  id: string;
  shipmentId?: string;
  name: string;
  distanceKm: number;
  estimatedMinutes: number;
  riskScore: number;                  // 0-1
  disruptionProbability: number;      // 0-1
  geometry: [number, number][];
  recommended: boolean;
  via: string;
  reason?: string;
}

export interface Alert {
  id: string;
  type: "flood_risk" | "road_blocked" | "delivery_delay" | "landslide" | "congestion" | "other";
  severity: AlertSeverity;
  category: "all" | "weather" | "blockade" | "load_cap" | "delay";
  title: string;
  message: string;
  relatedRoadId?: string;
  relatedVehicleId?: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface WeatherSnapshot {
  location: string;
  lat: number;
  lng: number;
  rainfallMm: number;
  temperatureC: number;
  windKph: number;
  warningLevel: "none" | "watch" | "warning" | "severe";
  forecastSummary: string;
  timestamp: string;
}

export interface KpiSummary {
  activeVehicles: number;
  activeIncidents: number;
  atRiskRoutes: number;
  blockedRoutes: number;
  activeDeliveriesPercent: number;
  corridorSlaPercent: number;
  highPriorityShipments: number;
}

export interface DataSnapshot {
  vehicles: Vehicle[];
  roads: RoadSegment[];
  incidents: Incident[];
  shipments: Shipment[];
  routes: RouteOption[];
  alerts: Alert[];
  weather: WeatherSnapshot[];
  kpis: KpiSummary;
}

export type DataPatch = Partial<DataSnapshot>;
