import mongoose from 'mongoose';

export const geoPointSchema = new mongoose.Schema({
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: {
        type: [Number],
        required: true,
        validate: {
            validator: (coordinates: number[]) => coordinates.length === 2,
            message: 'Coordinates must be [longitude, latitude]',
        },
    },
}, { _id: false });
