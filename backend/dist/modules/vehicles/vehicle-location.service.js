import { redisClient } from '../../config/redis.js';
const getLocationKey = (vehicleId) => `vehicle:${vehicleId}:location`;
export const saveVehicleLocation = async (location) => {
    const savedLocation = {
        ...location,
        updatedAt: new Date().toISOString(),
    };
    await redisClient.set(getLocationKey(location.vehicleId), JSON.stringify(savedLocation));
    return savedLocation;
};
export const getVehicleLocation = async (vehicleId) => {
    const location = await redisClient.get(getLocationKey(vehicleId));
    return location ? JSON.parse(location) : null;
};
export const connectLocationStore = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};
export const closeLocationStore = async () => {
    if (redisClient.isOpen) {
        await redisClient.quit();
    }
};
//# sourceMappingURL=vehicle-location.service.js.map