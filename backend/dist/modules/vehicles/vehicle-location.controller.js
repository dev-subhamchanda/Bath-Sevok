import { Vehicle } from '../../models/vehicle.model.js';
export const getVehicles = async (_req, res) => {
    try {
        const vehicles = await Vehicle.find().select('-__v').lean();
        res.status(200).json({ vehicles });
    }
    catch (error) {
        console.error('Error retrieving vehicles:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
import { getVehicleLocation } from './vehicle-location.service.js';
export const getCurrentVehicleLocation = async (req, res) => {
    try {
        const vehicleId = String(req.params.vehicleId);
        const location = await getVehicleLocation(vehicleId);
        if (!location) {
            res.status(404).json({ message: 'Current vehicle location not found' });
            return;
        }
        res.status(200).json({ location });
    }
    catch (error) {
        console.error('Error getting vehicle location:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
//# sourceMappingURL=vehicle-location.controller.js.map