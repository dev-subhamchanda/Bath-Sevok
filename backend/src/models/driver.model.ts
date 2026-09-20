import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, trim: true },
    status: { type: String, enum: ['AVAILABLE', 'ON_DUTY', 'OFF_DUTY', 'SUSPENDED'], default: 'AVAILABLE', required: true },
}, { timestamps: true });

export const Driver = mongoose.model('Driver', driverSchema);
