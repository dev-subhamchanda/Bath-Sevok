import mongoose from 'mongoose';
export declare const Shipment: mongoose.Model<{
    trackingNumber: string;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    loadType: string;
    vehicleUnit: "heavy" | "light" | "moderate";
    fleetClassification: "transit";
    imageUrl: string;
    imagePublicId: string;
    vehicleId?: mongoose.Types.ObjectId | null;
    driverId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    route: {
        distanceKm: number;
        durationMinutes: number;
        geometry?: any;
    };
    weightKg: number;
    priority: "HIGH" | "LOW" | "NORMAL" | "URGENT";
    status: "ASSIGNED" | "CANCELLED" | "DELIVERED" | "IN_TRANSIT" | "PENDING";
    expectedDelivery?: NativeDate | null;
} & mongoose.DefaultTimestampProps, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    trackingNumber: string;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    loadType: string;
    vehicleUnit: "heavy" | "light" | "moderate";
    fleetClassification: "transit";
    imageUrl: string;
    imagePublicId: string;
    vehicleId?: mongoose.Types.ObjectId | null;
    driverId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    route: {
        distanceKm: number;
        durationMinutes: number;
        geometry?: any;
    };
    weightKg: number;
    priority: "HIGH" | "LOW" | "NORMAL" | "URGENT";
    status: "ASSIGNED" | "CANCELLED" | "DELIVERED" | "IN_TRANSIT" | "PENDING";
    expectedDelivery?: NativeDate | null;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, {
    timestamps: true;
}> & Omit<{
    trackingNumber: string;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    loadType: string;
    vehicleUnit: "heavy" | "light" | "moderate";
    fleetClassification: "transit";
    imageUrl: string;
    imagePublicId: string;
    vehicleId?: mongoose.Types.ObjectId | null;
    driverId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    route: {
        distanceKm: number;
        durationMinutes: number;
        geometry?: any;
    };
    weightKg: number;
    priority: "HIGH" | "LOW" | "NORMAL" | "URGENT";
    status: "ASSIGNED" | "CANCELLED" | "DELIVERED" | "IN_TRANSIT" | "PENDING";
    expectedDelivery?: NativeDate | null;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    trackingNumber: string;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    loadType: string;
    vehicleUnit: "heavy" | "light" | "moderate";
    fleetClassification: "transit";
    imageUrl: string;
    imagePublicId: string;
    vehicleId?: mongoose.Types.ObjectId | null;
    driverId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    route: {
        distanceKm: number;
        durationMinutes: number;
        geometry?: any;
    };
    weightKg: number;
    priority: "HIGH" | "LOW" | "NORMAL" | "URGENT";
    status: "ASSIGNED" | "CANCELLED" | "DELIVERED" | "IN_TRANSIT" | "PENDING";
    expectedDelivery?: NativeDate | null;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, {
    trackingNumber: string;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    loadType: string;
    vehicleUnit: "heavy" | "light" | "moderate";
    fleetClassification: "transit";
    imageUrl: string;
    imagePublicId: string;
    vehicleId?: mongoose.Types.ObjectId | null;
    driverId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    route: {
        distanceKm: number;
        durationMinutes: number;
        geometry?: any;
    };
    weightKg: number;
    priority: "HIGH" | "LOW" | "NORMAL" | "URGENT";
    status: "ASSIGNED" | "CANCELLED" | "DELIVERED" | "IN_TRANSIT" | "PENDING";
    expectedDelivery?: NativeDate | null;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, Omit<mongoose.DefaultSchemaOptions, "timestamps"> & {
    timestamps: true;
}> & Omit<{
    trackingNumber: string;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    loadType: string;
    vehicleUnit: "heavy" | "light" | "moderate";
    fleetClassification: "transit";
    imageUrl: string;
    imagePublicId: string;
    vehicleId?: mongoose.Types.ObjectId | null;
    driverId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    route: {
        distanceKm: number;
        durationMinutes: number;
        geometry?: any;
    };
    weightKg: number;
    priority: "HIGH" | "LOW" | "NORMAL" | "URGENT";
    status: "ASSIGNED" | "CANCELLED" | "DELIVERED" | "IN_TRANSIT" | "PENDING";
    expectedDelivery?: NativeDate | null;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, unknown, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    trackingNumber: string;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    loadType: string;
    vehicleUnit: "heavy" | "light" | "moderate";
    fleetClassification: "transit";
    imageUrl: string;
    imagePublicId: string;
    vehicleId?: mongoose.Types.ObjectId | null;
    driverId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    route: {
        distanceKm: number;
        durationMinutes: number;
        geometry?: any;
    };
    weightKg: number;
    priority: "HIGH" | "LOW" | "NORMAL" | "URGENT";
    status: "ASSIGNED" | "CANCELLED" | "DELIVERED" | "IN_TRANSIT" | "PENDING";
    expectedDelivery?: NativeDate | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    trackingNumber: string;
    origin: {
        type: "Point";
        coordinates: number[];
    };
    destination: {
        type: "Point";
        coordinates: number[];
    };
    loadType: string;
    vehicleUnit: "heavy" | "light" | "moderate";
    fleetClassification: "transit";
    imageUrl: string;
    imagePublicId: string;
    vehicleId?: mongoose.Types.ObjectId | null;
    driverId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    route: {
        distanceKm: number;
        durationMinutes: number;
        geometry?: any;
    };
    weightKg: number;
    priority: "HIGH" | "LOW" | "NORMAL" | "URGENT";
    status: "ASSIGNED" | "CANCELLED" | "DELIVERED" | "IN_TRANSIT" | "PENDING";
    expectedDelivery?: NativeDate | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=shipment.model.d.ts.map