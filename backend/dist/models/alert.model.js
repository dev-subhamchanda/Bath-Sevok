import mongoose from 'mongoose';
const alertSchema = new mongoose.Schema({
    type: { type: String, required: true, trim: true },
    severity: { type: String, enum: ['INFO', 'WARNING', 'HIGH', 'CRITICAL'], required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
    status: { type: String, enum: ['UNREAD', 'READ', 'DISMISSED'], default: 'UNREAD', required: true },
    readAt: { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false } });
export const Alert = mongoose.model('Alert', alertSchema);
//# sourceMappingURL=alert.model.js.map