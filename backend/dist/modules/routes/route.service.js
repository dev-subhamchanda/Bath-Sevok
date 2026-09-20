import { generateRoute } from '../../integrations/openrouteservice.js';
const calculateDistanceKm = (origin, destination) => {
    const [originLongitude, originLatitude] = origin.coordinates;
    const [destinationLongitude, destinationLatitude] = destination.coordinates;
    const earthRadiusKm = 6371;
    const toRadians = (degrees) => degrees * Math.PI / 180;
    const latitudeDelta = toRadians(destinationLatitude - originLatitude);
    const longitudeDelta = toRadians(destinationLongitude - originLongitude);
    const latitudeA = toRadians(originLatitude);
    const latitudeB = toRadians(destinationLatitude);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
};
export const getAlternativeRoutes = async (origin, destination) => {
    const useAlternatives = calculateDistanceKm(origin, destination) <= 100;
    const data = await generateRoute(origin, destination, {
        ...(useAlternatives && {
            alternativeRoutes: {
                targetCount: 3,
                shareFactor: 0.6,
                weightFactor: 1.4,
            },
        }),
    });
    return (data.features ?? []).map((feature) => {
        const geometry = feature.geometry;
        return {
            distanceKm: Number(((feature.properties?.summary?.distance ?? 0) / 1000).toFixed(2)),
            durationMinutes: Number(((feature.properties?.summary?.duration ?? 0) / 60).toFixed(2)),
            coordinates: geometry?.coordinates ?? [],
            geometry: feature.geometry,
        };
    });
};
//# sourceMappingURL=route.service.js.map