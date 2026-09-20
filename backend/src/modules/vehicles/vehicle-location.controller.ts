import type { Request, Response } from 'express';
import { getVehicleLocation } from './vehicle-location.service.js';

export const getCurrentVehicleLocation = async (req: Request, res: Response): Promise<void> => {
	try {
		const vehicleId = String(req.params.vehicleId);
		const location = await getVehicleLocation(vehicleId);

		if (!location) {
			res.status(404).json({ message: 'Current vehicle location not found' });
			return;
		}

		res.status(200).json({ location });
	} catch (error) {
		console.error('Error getting vehicle location:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};
