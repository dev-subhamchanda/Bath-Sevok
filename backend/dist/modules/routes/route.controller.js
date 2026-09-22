import { getAlternativeRoutes } from './route.service.js';
import { getPreferableRoute } from '../../integrations/aiService.js';
const isPoint = (value) => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const point = value;
    if (point.type !== 'Point' || !Array.isArray(point.coordinates) || point.coordinates.length !== 2) {
        return false;
    }
    const [longitude, latitude] = point.coordinates;
    return typeof longitude === 'number'
        && Number.isFinite(longitude)
        && longitude >= -180
        && longitude <= 180
        && typeof latitude === 'number'
        && Number.isFinite(latitude)
        && latitude >= -90
        && latitude <= 90;
};
export const getRoutes = async (req, res) => {
    const { origin, destination, vehicle_profile: vehicleProfile = 'heavy_truck', } = req.body;
    if (!isPoint(origin) || !isPoint(destination)) {
        res.status(400).json({
            message: 'origin and destination must be GeoJSON Point objects',
        });
        return;
    }
    try {
        // ROUTE FROM OPENROUTESERVICE
        // const routes = await getAlternativeRoutes(origin, destination);
        // ROUTE FROM AI SERVICE
        const routes = await getPreferableRoute({
            origin,
            destination,
            vehicle_profile: vehicleProfile,
        });
        res.status(200).json({ routes });
    }
    catch (error) {
        console.error('Error getting alternative routes:', error);
        if (error instanceof Error && error.message === 'ORS_API_KEY is not configured') {
            res.status(500).json({ message: 'OpenRouteService is not configured' });
            return;
        }
        res.status(502).json({ message: 'Could not get routes from OpenRouteService' });
    }
};
//# sourceMappingURL=route.controller.js.map