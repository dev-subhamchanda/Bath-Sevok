import mongoose from 'mongoose';
export declare const WeatherObservation: mongoose.Model<{
    location: {
        type: "Point";
        coordinates: number[];
    };
    temperature: number;
    humidity: number;
    rainfallMm: number;
    windSpeedKmh: number;
    visibilityKm: number;
    condition: string;
    recordedAt: NativeDate;
    source: string;
} & mongoose.DefaultTimestampProps, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    location: {
        type: "Point";
        coordinates: number[];
    };
    temperature: number;
    humidity: number;
    rainfallMm: number;
    windSpeedKmh: number;
    visibilityKm: number;
    condition: string;
    recordedAt: NativeDate;
    source: string;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, {
    timestamps: true;
}> & Omit<{
    location: {
        type: "Point";
        coordinates: number[];
    };
    temperature: number;
    humidity: number;
    rainfallMm: number;
    windSpeedKmh: number;
    visibilityKm: number;
    condition: string;
    recordedAt: NativeDate;
    source: string;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    location: {
        type: "Point";
        coordinates: number[];
    };
    temperature: number;
    humidity: number;
    rainfallMm: number;
    windSpeedKmh: number;
    visibilityKm: number;
    condition: string;
    recordedAt: NativeDate;
    source: string;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, {
    location: {
        type: "Point";
        coordinates: number[];
    };
    temperature: number;
    humidity: number;
    rainfallMm: number;
    windSpeedKmh: number;
    visibilityKm: number;
    condition: string;
    recordedAt: NativeDate;
    source: string;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, Omit<mongoose.DefaultSchemaOptions, "timestamps"> & {
    timestamps: true;
}> & Omit<{
    location: {
        type: "Point";
        coordinates: number[];
    };
    temperature: number;
    humidity: number;
    rainfallMm: number;
    windSpeedKmh: number;
    visibilityKm: number;
    condition: string;
    recordedAt: NativeDate;
    source: string;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, unknown, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    location: {
        type: "Point";
        coordinates: number[];
    };
    temperature: number;
    humidity: number;
    rainfallMm: number;
    windSpeedKmh: number;
    visibilityKm: number;
    condition: string;
    recordedAt: NativeDate;
    source: string;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    location: {
        type: "Point";
        coordinates: number[];
    };
    temperature: number;
    humidity: number;
    rainfallMm: number;
    windSpeedKmh: number;
    visibilityKm: number;
    condition: string;
    recordedAt: NativeDate;
    source: string;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=weather-observation.model.d.ts.map