import mongoose from 'mongoose';
export declare const Route: mongoose.Model<{
    shipmentId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    distanceKm: number;
    durationMinutes: number;
    geometry?: any;
    encodedPolyline?: string | null;
    routingProvider: string;
    prediction?: {
        predictedDurationMinutes: number;
        predictedDelayMinutes: number;
        delayProbability: number;
        riskScore: number;
        riskLevel: "HIGH" | "LOW" | "MEDIUM";
    } | null;
    recommended: boolean;
} & mongoose.DefaultTimestampProps, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    shipmentId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    distanceKm: number;
    durationMinutes: number;
    geometry?: any;
    encodedPolyline?: string | null;
    routingProvider: string;
    prediction?: {
        predictedDurationMinutes: number;
        predictedDelayMinutes: number;
        delayProbability: number;
        riskScore: number;
        riskLevel: "HIGH" | "LOW" | "MEDIUM";
    } | null;
    recommended: boolean;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, {
    timestamps: true;
}> & Omit<{
    shipmentId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    distanceKm: number;
    durationMinutes: number;
    geometry?: any;
    encodedPolyline?: string | null;
    routingProvider: string;
    prediction?: {
        predictedDurationMinutes: number;
        predictedDelayMinutes: number;
        delayProbability: number;
        riskScore: number;
        riskLevel: "HIGH" | "LOW" | "MEDIUM";
    } | null;
    recommended: boolean;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    shipmentId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    distanceKm: number;
    durationMinutes: number;
    geometry?: any;
    encodedPolyline?: string | null;
    routingProvider: string;
    prediction?: {
        predictedDurationMinutes: number;
        predictedDelayMinutes: number;
        delayProbability: number;
        riskScore: number;
        riskLevel: "HIGH" | "LOW" | "MEDIUM";
    } | null;
    recommended: boolean;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, {
    shipmentId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    distanceKm: number;
    durationMinutes: number;
    geometry?: any;
    encodedPolyline?: string | null;
    routingProvider: string;
    prediction?: {
        predictedDurationMinutes: number;
        predictedDelayMinutes: number;
        delayProbability: number;
        riskScore: number;
        riskLevel: "HIGH" | "LOW" | "MEDIUM";
    } | null;
    recommended: boolean;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, Omit<mongoose.DefaultSchemaOptions, "timestamps"> & {
    timestamps: true;
}> & Omit<{
    shipmentId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    distanceKm: number;
    durationMinutes: number;
    geometry?: any;
    encodedPolyline?: string | null;
    routingProvider: string;
    prediction?: {
        predictedDurationMinutes: number;
        predictedDelayMinutes: number;
        delayProbability: number;
        riskScore: number;
        riskLevel: "HIGH" | "LOW" | "MEDIUM";
    } | null;
    recommended: boolean;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, unknown, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    shipmentId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    distanceKm: number;
    durationMinutes: number;
    geometry?: any;
    encodedPolyline?: string | null;
    routingProvider: string;
    prediction?: {
        predictedDurationMinutes: number;
        predictedDelayMinutes: number;
        delayProbability: number;
        riskScore: number;
        riskLevel: "HIGH" | "LOW" | "MEDIUM";
    } | null;
    recommended: boolean;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    shipmentId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    distanceKm: number;
    durationMinutes: number;
    geometry?: any;
    encodedPolyline?: string | null;
    routingProvider: string;
    prediction?: {
        predictedDurationMinutes: number;
        predictedDelayMinutes: number;
        delayProbability: number;
        riskScore: number;
        riskLevel: "HIGH" | "LOW" | "MEDIUM";
    } | null;
    recommended: boolean;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=route.model.d.ts.map