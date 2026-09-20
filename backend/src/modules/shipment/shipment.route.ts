import { Router } from 'express';
import { createShipment } from './shipment.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { getShipments, trackShipmentController } from './shipment.controller.js';
import multer from 'multer';

const router = Router();

const shipmentImageUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 50 * 1024 },
	fileFilter: (_req, file, callback) => {
		callback(null, file.mimetype.startsWith('image/'));
	},
});

router.use(authMiddleware);
router.post('/create', shipmentImageUpload.single('image'), createShipment);
router.get('/list', getShipments);
router.post('/tracking', trackShipmentController);
//Also need a search shipment by tracking number and vehicle id route
export { router as shipmentRouter };