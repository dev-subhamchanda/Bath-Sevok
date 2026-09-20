export type VehicleUnit = "heavy" | "light" | "moderate";
export type FleetClassification = "transit";
export type ShipmentStatus = "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

export interface ShipmentFormValues {
  trackingNumber: string;
  vehicleId: string;
  driverId: string;
  routeId: string;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  commodity: string;
  weightKg: number;
  priority: 1 | 2 | 3;
  vehicleUnit: VehicleUnit;
  fleetClassification: FleetClassification;
  driverName: string;
  driverPhone: string;
  driverLicenseId: string;
  pickupTime: string;
  expectedDelivery: string;
  receiverName: string;
  receiverFacility: string;
  receiverPhone: string;
  specialInstructions: string;
}
