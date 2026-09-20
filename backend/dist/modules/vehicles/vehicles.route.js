import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { getCurrentVehicleLocation } from './vehicle-location.controller.js';
const router = Router();
router.use(authMiddleware);
router.get('/:vehicleId/location', getCurrentVehicleLocation);
export { router as vehiclesRouter };
//# sourceMappingURL=vehicles.route.js.map