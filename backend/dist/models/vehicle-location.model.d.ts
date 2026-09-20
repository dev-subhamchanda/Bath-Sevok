import mongoose from 'mongoose';
export declare const VehicleLocation: mongoose.Model<{
    vehicleId: mongoose.Types.ObjectId;
    location: {
        type: "Point";
        coordinates: number[];
    };
    speedKmh: number;
    heading: number;
    timestamp: NativeDate;
}, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    vehicleId: mongoose.Types.ObjectId;
    location: {
        type: "Point";
        coordinates: number[];
    };
    speedKmh: number;
    heading: number;
    timestamp: NativeDate;
}, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<{
    vehicleId: mongoose.Types.ObjectId;
    location: {
        type: "Point";
        coordinates: number[];
    };
    speedKmh: number;
    heading: number;
    timestamp: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    vehicleId: mongoose.Types.ObjectId;
    location: {
        type: "Point";
        coordinates: number[];
    };
    speedKmh: number;
    heading: number;
    timestamp: NativeDate;
}, mongoose.Document<unknown, {}, {
    vehicleId: mongoose.Types.ObjectId;
    location: {
        type: "Point";
        coordinates: number[];
    };
    speedKmh: number;
    heading: number;
    timestamp: NativeDate;
}, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<{
    vehicleId: mongoose.Types.ObjectId;
    location: {
        type: "Point";
        coordinates: number[];
    };
    speedKmh: number;
    heading: number;
    timestamp: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, unknown, {
    vehicleId: mongoose.Types.ObjectId;
    location: {
        type: "Point";
        coordinates: number[];
    };
    speedKmh: number;
    heading: number;
    timestamp: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    vehicleId: mongoose.Types.ObjectId;
    location: {
        type: "Point";
        coordinates: number[];
    };
    speedKmh: number;
    heading: number;
    timestamp: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=vehicle-location.model.d.ts.map