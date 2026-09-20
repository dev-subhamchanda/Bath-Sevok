import mongoose from 'mongoose';
import { geoPointSchema } from './common.model.js';
const weatherObservationSchema = new mongoose.Schema({
    location: { type: geoPointSchema, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true, min: 0, max: 100 },
    rainfallMm: { type: Number, required: true, min: 0 },
    windSpeedKmh: { type: Number, required: true, min: 0 },
    visibilityKm: { type: Number, required: true, min: 0 },
    condition: { type: String, required: true, trim: true },
    recordedAt: { type: Date, required: true },
    source: { type: String, required: true, trim: true },
}, { timestamps: true });
weatherObservationSchema.index({ location: '2dsphere' });
export const WeatherObservation = mongoose.model('WeatherObservation', weatherObservationSchema);
//# sourceMappingURL=weather-observation.model.js.map