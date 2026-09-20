import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { getVerifiedIncidents, reportIncident, verifyIncident } from './incident.controller.js';
const router = Router();
router.use(authMiddleware);
router.post('/report', reportIncident);
router.patch('/:incidentId/verify', verifyIncident);
router.get('/for-ai', getVerifiedIncidents);
export { router as incidentRouter };
//# sourceMappingURL=incident.route.js.map