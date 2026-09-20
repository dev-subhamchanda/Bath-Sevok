import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { geoPointSchema } from './common.model.js';

const routeSnapshotSchema = new mongoose.Schema({
    distanceKm: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, required: true, min: 0 },
    geometry: { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const shipmentSchema = new mongoose.Schema({
    trackingNumber: { type: String, required: true, unique: true, trim: true, immutable: true },
    origin: { type: geoPointSchema, required: true },
    destination: { type: geoPointSchema, required: true },
    loadType: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    imagePublicId: { type: String, required: true, trim: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
    route: { type: routeSnapshotSchema, required: true },
    weightKg: { type: Number, required: true, min: 0 },
    priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL', required: true },
    status: { type: String, enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'], default: 'PENDING', required: true },
    expectedDelivery: { type: Date },
    actualDelivery: { type: Date },
}, { timestamps: true });

shipmentSchema.pre('validate', async function generateTrackingNumber() {
    if (this.trackingNumber) {
    return;
    }

    let trackingNumber: string;
    do {
        trackingNumber = `NXR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`;
    } while (await mongoose.models.Shipment?.exists({ trackingNumber }));

    this.trackingNumber = trackingNumber;
});

export const Shipment = mongoose.model('Shipment', shipmentSchema);
