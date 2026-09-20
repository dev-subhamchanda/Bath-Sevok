import { Incident } from '../../models/incident.model.js';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RoadStatus = 'OPEN' | 'PARTIALLY_AVAILABLE' | 'BLOCKED';

export const getRoadStatus = (severity: IncidentSeverity): RoadStatus => {
    if (severity === 'CRITICAL' || severity === 'HIGH') {
        return 'BLOCKED';
    }

    if (severity === 'MEDIUM') {
        return 'PARTIALLY_AVAILABLE';
    }

    return 'OPEN';
};

export const getIncidentsForAi = async () => Incident.find({
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
}).sort({ createdAt: -1 }).lean();
