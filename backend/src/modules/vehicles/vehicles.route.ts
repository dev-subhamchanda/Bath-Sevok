import {Router} from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { getCurrentVehicleLocation } from './vehicle-location.controller.js';
import { getVehicles } from './vehicle-location.controller.js';

const router = Router();

router.use(authMiddleware);
router.get('/list', getVehicles);
router.get('/:vehicleId/location', getCurrentVehicleLocation);

export { router as vehiclesRouter };
