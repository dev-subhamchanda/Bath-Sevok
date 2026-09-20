import mongoose from 'mongoose';
export declare const Driver: mongoose.Model<{
    userId: mongoose.Types.ObjectId;
    licenseNumber: string;
    phone?: string | null;
    status: "AVAILABLE" | "OFF_DUTY" | "ON_DUTY" | "SUSPENDED";
} & mongoose.DefaultTimestampProps, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    userId: mongoose.Types.ObjectId;
    licenseNumber: string;
    phone?: string | null;
    status: "AVAILABLE" | "OFF_DUTY" | "ON_DUTY" | "SUSPENDED";
} & mongoose.DefaultTimestampProps, {
    id: string;
}, {
    timestamps: true;
}> & Omit<{
    userId: mongoose.Types.ObjectId;
    licenseNumber: string;
    phone?: string | null;
    status: "AVAILABLE" | "OFF_DUTY" | "ON_DUTY" | "SUSPENDED";
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    userId: mongoose.Types.ObjectId;
    licenseNumber: string;
    phone?: string | null;
    status: "AVAILABLE" | "OFF_DUTY" | "ON_DUTY" | "SUSPENDED";
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, {
    userId: mongoose.Types.ObjectId;
    licenseNumber: string;
    phone?: string | null;
    status: "AVAILABLE" | "OFF_DUTY" | "ON_DUTY" | "SUSPENDED";
} & mongoose.DefaultTimestampProps, {
    id: string;
}, Omit<mongoose.DefaultSchemaOptions, "timestamps"> & {
    timestamps: true;
}> & Omit<{
    userId: mongoose.Types.ObjectId;
    licenseNumber: string;
    phone?: string | null;
    status: "AVAILABLE" | "OFF_DUTY" | "ON_DUTY" | "SUSPENDED";
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, unknown, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    licenseNumber: string;
    phone?: string | null;
    status: "AVAILABLE" | "OFF_DUTY" | "ON_DUTY" | "SUSPENDED";
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    userId: mongoose.Types.ObjectId;
    licenseNumber: string;
    phone?: string | null;
    status: "AVAILABLE" | "OFF_DUTY" | "ON_DUTY" | "SUSPENDED";
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=driver.model.d.ts.map