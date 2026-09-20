import mongoose from 'mongoose';
import { Role, UserStatus, type UserDocument } from '../types/auth.types.js';

const userSchema = new mongoose.Schema<UserDocument>({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(Role), default: Role.USER, required: true },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE, required: true },
    phone: { type: String, trim: true },
    lastLoginAt: { type: Date },
}, { timestamps: true });

export const User = mongoose.model<UserDocument>('User', userSchema);