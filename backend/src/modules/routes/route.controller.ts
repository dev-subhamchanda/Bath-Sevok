import type { Request, Response } from 'express';
import { getAlternativeRoutes, type Point } from './route.service.js';

const isPoint = (value: unknown): value is Point => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const point = value as { type?: unknown; coordinates?: unknown };
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

export const getRoutes = async (req: Request, res: Response): Promise<void> => {
    const { origin, destination } = req.body as { origin?: unknown; destination?: unknown };

    if (!isPoint(origin) || !isPoint(destination)) {
        res.status(400).json({
            message: 'origin and destination must be GeoJSON Point objects',
        });
        return;
    }

    try {
        const routes = await getAlternativeRoutes(origin, destination);
        res.status(200).json({ routes });
    } catch (error) {
        console.error('Error getting alternative routes:', error);

        if (error instanceof Error && error.message === 'ORS_API_KEY is not configured') {
            res.status(500).json({ message: 'OpenRouteService is not configured' });
            return;
        }

        res.status(502).json({ message: 'Could not get routes from OpenRouteService' });
    }
};
