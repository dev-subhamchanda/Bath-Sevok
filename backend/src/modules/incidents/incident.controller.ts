import type { Request, Response } from 'express';
import { Incident } from '../../models/incident.model.js';
import { getIncidentsForAi, getRoadStatus, type IncidentSeverity } from './incident.service.js';

const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const incidentTypes = ['ACCIDENT', 'ROAD_CLOSURE', 'CONSTRUCTION', 'WEATHER', 'TRAFFIC', 'OTHER'] as const;

const isPoint = (value: unknown): value is { type: 'Point'; coordinates: [number, number] } => {
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

export const reportIncident = async (req: Request, res: Response): Promise<void> => {
    const { type, title, description, location, severity, source, startedAt } = req.body as Record<string, unknown>;

    if (typeof type !== 'string' || !incidentTypes.includes(type as typeof incidentTypes[number])
        || typeof title !== 'string' || title.trim().length === 0
        || !isPoint(location)
        || !severities.includes(severity as IncidentSeverity)
        || typeof source !== 'string' || source.trim().length === 0) {
        res.status(400).json({ message: 'type, title, location, severity and source are required' });
        return;
    }

    try {
        const incident = await Incident.create({
            type,
            title: title.trim(),
            location,
            severity: severity as IncidentSeverity,
            roadStatus: getRoadStatus(severity as IncidentSeverity),
            source: source.trim(),
            startedAt: startedAt ? new Date(String(startedAt)) : new Date(),
            verificationStatus: 'PENDING',
            ...(typeof description === 'string' ? { description: description.trim() } : {}),
        });

        res.status(201).json({ message: 'Incident report created and is waiting for verification', incident });
    } catch (error) {
        console.error('Error creating incident report:', error);
        res.status(500).json({ message: 'Could not create incident report' });
    }
};

export const verifyIncident = async (req: Request, res: Response): Promise<void> => {
    try {
        const incident = await Incident.findByIdAndUpdate(
            req.params.incidentId,
            {
                verificationStatus: 'VERIFIED',
                verifiedAt: new Date(),
                verifiedBy: typeof req.body.verifiedBy === 'string' ? req.body.verifiedBy : 'system',
            },
            { new: true, runValidators: true },
        );

        if (!incident) {
            res.status(404).json({ message: 'Incident not found' });
            return;
        }

        res.status(200).json({ message: 'Incident verified', incident });
    } catch (error) {
        console.error('Error verifying incident:', error);
        res.status(500).json({ message: 'Could not verify incident' });
    }
};

export const getVerifiedIncidents = async (_req: Request, res: Response): Promise<void> => {
    try {
        const incidents = await getIncidentsForAi();
        res.status(200).json({ incidents });
    } catch (error) {
        console.error('Error getting incidents for AI:', error);
        res.status(500).json({ message: 'Could not get incidents' });
    }
};
