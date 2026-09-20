import mongoose from 'mongoose';
export declare const Alert: mongoose.Model<{
    type: string;
    severity: "CRITICAL" | "HIGH" | "INFO" | "WARNING";
    title: string;
    message: string;
    userId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    shipmentId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    status: "DISMISSED" | "READ" | "UNREAD";
    readAt?: NativeDate | null;
    createdAt: NativeDate;
}, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    type: string;
    severity: "CRITICAL" | "HIGH" | "INFO" | "WARNING";
    title: string;
    message: string;
    userId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    shipmentId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    status: "DISMISSED" | "READ" | "UNREAD";
    readAt?: NativeDate | null;
    createdAt: NativeDate;
}, {
    id: string;
}, {
    timestamps: {
        createdAt: true;
        updatedAt: false;
    };
}> & Omit<{
    type: string;
    severity: "CRITICAL" | "HIGH" | "INFO" | "WARNING";
    title: string;
    message: string;
    userId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    shipmentId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    status: "DISMISSED" | "READ" | "UNREAD";
    readAt?: NativeDate | null;
    createdAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: {
        createdAt: true;
        updatedAt: false;
    };
}, {
    type: string;
    severity: "CRITICAL" | "HIGH" | "INFO" | "WARNING";
    title: string;
    message: string;
    userId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    shipmentId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    status: "DISMISSED" | "READ" | "UNREAD";
    readAt?: NativeDate | null;
    createdAt: NativeDate;
}, mongoose.Document<unknown, {}, {
    type: string;
    severity: "CRITICAL" | "HIGH" | "INFO" | "WARNING";
    title: string;
    message: string;
    userId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    shipmentId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    status: "DISMISSED" | "READ" | "UNREAD";
    readAt?: NativeDate | null;
    createdAt: NativeDate;
}, {
    id: string;
}, Omit<mongoose.DefaultSchemaOptions, "timestamps"> & {
    timestamps: {
        createdAt: true;
        updatedAt: false;
    };
}> & Omit<{
    type: string;
    severity: "CRITICAL" | "HIGH" | "INFO" | "WARNING";
    title: string;
    message: string;
    userId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    shipmentId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    status: "DISMISSED" | "READ" | "UNREAD";
    readAt?: NativeDate | null;
    createdAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, unknown, {
    type: string;
    severity: "CRITICAL" | "HIGH" | "INFO" | "WARNING";
    title: string;
    message: string;
    userId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    shipmentId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    status: "DISMISSED" | "READ" | "UNREAD";
    readAt?: NativeDate | null;
    createdAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    type: string;
    severity: "CRITICAL" | "HIGH" | "INFO" | "WARNING";
    title: string;
    message: string;
    userId?: mongoose.Types.ObjectId | null;
    vehicleId?: mongoose.Types.ObjectId | null;
    shipmentId?: mongoose.Types.ObjectId | null;
    routeId?: mongoose.Types.ObjectId | null;
    status: "DISMISSED" | "READ" | "UNREAD";
    readAt?: NativeDate | null;
    createdAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=alert.model.d.ts.map