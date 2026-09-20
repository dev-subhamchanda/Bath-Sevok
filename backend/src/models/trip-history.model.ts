import mongoose from 'mongoose';

const tripHistorySchema = new mongoose.Schema({
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
    distanceKm: { type: Number, required: true, min: 0 },
    plannedDurationMinutes: { type: Number, required: true, min: 0 },
    actualDurationMinutes: { type: Number, required: true, min: 0 },
    delayMinutes: { type: Number, required: true, min: 0 },
    trafficLevel: { type: String, required: true, trim: true },
    weather: { type: mongoose.Schema.Types.Mixed },
    incidentCount: { type: Number, required: true, min: 0 },
    roadCondition: { type: String, required: true, trim: true },
    averageSpeedKmh: { type: Number, required: true, min: 0 },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
});

export const TripHistory = mongoose.model('TripHistory', tripHistorySchema);
