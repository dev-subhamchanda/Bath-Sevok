import mongoose from 'mongoose';
export declare const Vehicle: mongoose.Model<{
    vehicleNumber: string;
    type: string;
    capacityKg: number;
    driverId?: mongoose.Types.ObjectId | null;
    status: "AVAILABLE" | "INACTIVE" | "IN_TRANSIT" | "MAINTENANCE";
    currentLocation?: {
        type: "Point";
        coordinates: number[];
    } | null;
    speedKmh?: number | null;
    heading?: number | null;
} & mongoose.DefaultTimestampProps, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    vehicleNumber: string;
    type: string;
    capacityKg: number;
    driverId?: mongoose.Types.ObjectId | null;
    status: "AVAILABLE" | "INACTIVE" | "IN_TRANSIT" | "MAINTENANCE";
    currentLocation?: {
        type: "Point";
        coordinates: number[];
    } | null;
    speedKmh?: number | null;
    heading?: number | null;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, {
    timestamps: true;
}> & Omit<{
    vehicleNumber: string;
    type: string;
    capacityKg: number;
    driverId?: mongoose.Types.ObjectId | null;
    status: "AVAILABLE" | "INACTIVE" | "IN_TRANSIT" | "MAINTENANCE";
    currentLocation?: {
        type: "Point";
        coordinates: number[];
    } | null;
    speedKmh?: number | null;
    heading?: number | null;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    vehicleNumber: string;
    type: string;
    capacityKg: number;
    driverId?: mongoose.Types.ObjectId | null;
    status: "AVAILABLE" | "INACTIVE" | "IN_TRANSIT" | "MAINTENANCE";
    currentLocation?: {
        type: "Point";
        coordinates: number[];
    } | null;
    speedKmh?: number | null;
    heading?: number | null;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, {
    vehicleNumber: string;
    type: string;
    capacityKg: number;
    driverId?: mongoose.Types.ObjectId | null;
    status: "AVAILABLE" | "INACTIVE" | "IN_TRANSIT" | "MAINTENANCE";
    currentLocation?: {
        type: "Point";
        coordinates: number[];
    } | null;
    speedKmh?: number | null;
    heading?: number | null;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, Omit<mongoose.DefaultSchemaOptions, "timestamps"> & {
    timestamps: true;
}> & Omit<{
    vehicleNumber: string;
    type: string;
    capacityKg: number;
    driverId?: mongoose.Types.ObjectId | null;
    status: "AVAILABLE" | "INACTIVE" | "IN_TRANSIT" | "MAINTENANCE";
    currentLocation?: {
        type: "Point";
        coordinates: number[];
    } | null;
    speedKmh?: number | null;
    heading?: number | null;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, unknown, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    vehicleNumber: string;
    type: string;
    capacityKg: number;
    driverId?: mongoose.Types.ObjectId | null;
    status: "AVAILABLE" | "INACTIVE" | "IN_TRANSIT" | "MAINTENANCE";
    currentLocation?: {
        type: "Point";
        coordinates: number[];
    } | null;
    speedKmh?: number | null;
    heading?: number | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    vehicleNumber: string;
    type: string;
    capacityKg: number;
    driverId?: mongoose.Types.ObjectId | null;
    status: "AVAILABLE" | "INACTIVE" | "IN_TRANSIT" | "MAINTENANCE";
    currentLocation?: {
        type: "Point";
        coordinates: number[];
    } | null;
    speedKmh?: number | null;
    heading?: number | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=vehicle.model.d.ts.map