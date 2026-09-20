import { Incident } from '../../models/incident.model.js';
export const getRoadStatus = (severity) => {
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
//# sourceMappingURL=incident.service.js.map