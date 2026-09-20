import mongoose from 'mongoose';
import { geoPointSchema } from './common.model.js';

const vehicleSchema = new mongoose.Schema({
    vehicleNumber: { type: String, required: true, unique: true, trim: true },
    type: { type: String, required: true, trim: true },
    capacityKg: { type: Number, required: true, min: 0 },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    status: { type: String, enum: ['AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'INACTIVE'], default: 'AVAILABLE', required: true },
    currentLocation: { type: geoPointSchema },
    speedKmh: { type: Number, min: 0 },
    heading: { type: Number, min: 0, max: 360 },
}, { timestamps: true });

vehicleSchema.index({ currentLocation: '2dsphere' });

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);
