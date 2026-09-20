import mongoose from 'mongoose';
import { geoPointSchema } from './common.model.js';
const vehicleLocationSchema = new mongoose.Schema({
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    location: { type: geoPointSchema, required: true },
    speedKmh: { type: Number, required: true, min: 0 },
    heading: { type: Number, required: true, min: 0, max: 360 },
    timestamp: { type: Date, required: true, default: Date.now },
});
vehicleLocationSchema.index({ location: '2dsphere' });
vehicleLocationSchema.index({ vehicleId: 1, timestamp: -1 });
export const VehicleLocation = mongoose.model('VehicleLocation', vehicleLocationSchema);
//# sourceMappingURL=vehicle-location.model.js.map