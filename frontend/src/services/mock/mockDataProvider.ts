import type { DataProvider } from "../dataProvider";
import { simulationEngine } from "./simulationEngine";
import type {
  DataSnapshot,
  DataPatch,
  Incident,
  NewIncidentInput,
  Shipment
} from "@/types/domain";

export class MockDataProvider implements DataProvider {
  public async connect(): Promise<DataSnapshot> {
    return simulationEngine.getSnapshot();
  }

  public subscribe(onPatch: (patch: DataPatch) => void): () => void {
    return simulationEngine.subscribe(onPatch);
  }

  public async submitIncident(input: NewIncidentInput): Promise<Incident> {
    return simulationEngine.submitIncident(input);
  }

  public async requestReroute(shipmentId: string, routeId: string): Promise<Shipment> {
    return simulationEngine.requestReroute(shipmentId, routeId);
  }

  public async triggerDemoEvent(event: "heavy_rainfall" | "reset"): Promise<void> {
    return simulationEngine.triggerDemoEvent(event);
  }

  public disconnect(): void {
    // No-op for mock provider
  }
}

export const mockDataProvider = new MockDataProvider();
