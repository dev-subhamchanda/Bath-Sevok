import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { getRoutes } from './route.controller.js';
const router = Router();
// router.use(authMiddleware);
router.post('/alternatives', getRoutes);
export { router as routeRouter };
//# sourceMappingURL=route.route.js.map