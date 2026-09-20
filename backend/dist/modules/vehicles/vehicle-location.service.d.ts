export interface VehicleLocationData {
    vehicleId: string;
    latitude: number;
    longitude: number;
    speedKmh: number;
    heading: number;
    updatedAt: string;
}
export declare const saveVehicleLocation: (location: Omit<VehicleLocationData, 'updatedAt'>) => Promise<VehicleLocationData>;
export declare const getVehicleLocation: (vehicleId: string) => Promise<VehicleLocationData | null>;
export declare const connectLocationStore: () => Promise<void>;
export declare const closeLocationStore: () => Promise<void>;
//# sourceMappingURL=vehicle-location.service.d.ts.map