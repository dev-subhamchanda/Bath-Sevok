import mongoose from 'mongoose';
import { geoPointSchema } from './common.model.js';

const incidentSchema = new mongoose.Schema({
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: { type: geoPointSchema, required: true },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
    roadStatus: { type: String, enum: ['OPEN', 'PARTIALLY_AVAILABLE', 'BLOCKED'], required: true },
    verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING', required: true },
    verifiedAt: { type: Date },
    verifiedBy: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'RESOLVED'], default: 'ACTIVE', required: true },
    source: { type: String, required: true, trim: true },
    startedAt: { type: Date, required: true },
    resolvedAt: { type: Date },
}, { timestamps: true });

incidentSchema.index({ location: '2dsphere' });

export const Incident = mongoose.model('Incident', incidentSchema);
