import mongoose from 'mongoose';
import { geoPointSchema } from './common.model.js';
const predictionSchema = new mongoose.Schema({
    predictedDurationMinutes: { type: Number, required: true, min: 0 },
    predictedDelayMinutes: { type: Number, required: true, min: 0 },
    delayProbability: { type: Number, required: true, min: 0, max: 1 },
    riskScore: { type: Number, required: true, min: 0, max: 1 },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], required: true },
}, { _id: false });
const routeSchema = new mongoose.Schema({
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    origin: { type: geoPointSchema, required: true },
    destination: { type: geoPointSchema, required: true },
    distanceKm: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, required: true, min: 0 },
    geometry: { type: mongoose.Schema.Types.Mixed },
    encodedPolyline: { type: String },
    routingProvider: { type: String, required: true, trim: true },
    prediction: { type: predictionSchema },
    recommended: { type: Boolean, default: false },
}, { timestamps: true });
export const Route = mongoose.model('Route', routeSchema);
//# sourceMappingURL=route.model.js.map