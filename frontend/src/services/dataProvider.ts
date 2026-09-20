import type { DataSnapshot, DataPatch, Incident, NewIncidentInput, Shipment } from "@/types/domain";

export interface DataProvider {
  connect(): Promise<DataSnapshot>;
  subscribe(onPatch: (patch: DataPatch) => void): () => void; // returns unsubscribe
  submitIncident(input: NewIncidentInput): Promise<Incident>;
  requestReroute(shipmentId: string, routeId: string): Promise<Shipment>;
  triggerDemoEvent(event: "heavy_rainfall" | "reset"): Promise<void>;
  disconnect(): void;
}
