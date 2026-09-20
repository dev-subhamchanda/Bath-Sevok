import { redisClient } from '../../config/redis.js';

export interface VehicleLocationData {
    vehicleId: string;
    latitude: number;
    longitude: number;
    speedKmh: number;
    heading: number;
    updatedAt: string;
}

const getLocationKey = (vehicleId: string): string => `vehicle:${vehicleId}:location`;

export const saveVehicleLocation = async (
    location: Omit<VehicleLocationData, 'updatedAt'>,
): Promise<VehicleLocationData> => {
    const savedLocation: VehicleLocationData = {
        ...location,
        updatedAt: new Date().toISOString(),
    };

    await redisClient.set(getLocationKey(location.vehicleId), JSON.stringify(savedLocation));
    return savedLocation;
};

export const getVehicleLocation = async (vehicleId: string): Promise<VehicleLocationData | null> => {
    const location = await redisClient.get(getLocationKey(vehicleId));
    return location ? JSON.parse(location) as VehicleLocationData : null;
};

export const connectLocationStore = async (): Promise<void> => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};

export const closeLocationStore = async (): Promise<void> => {
    if (redisClient.isOpen) {
        await redisClient.quit();
    }
};
