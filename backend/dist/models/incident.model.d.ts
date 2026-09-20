import mongoose from 'mongoose';
export declare const Incident: mongoose.Model<{
    type: string;
    title: string;
    description?: string | null;
    location: {
        type: "Point";
        coordinates: number[];
    };
    severity: "CRITICAL" | "HIGH" | "LOW" | "MEDIUM";
    roadStatus: "BLOCKED" | "OPEN" | "PARTIALLY_AVAILABLE";
    verificationStatus: "PENDING" | "REJECTED" | "VERIFIED";
    verifiedAt?: NativeDate | null;
    verifiedBy?: string | null;
    status: "ACTIVE" | "RESOLVED";
    source: string;
    startedAt: NativeDate;
    resolvedAt?: NativeDate | null;
} & mongoose.DefaultTimestampProps, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    type: string;
    title: string;
    description?: string | null;
    location: {
        type: "Point";
        coordinates: number[];
    };
    severity: "CRITICAL" | "HIGH" | "LOW" | "MEDIUM";
    roadStatus: "BLOCKED" | "OPEN" | "PARTIALLY_AVAILABLE";
    verificationStatus: "PENDING" | "REJECTED" | "VERIFIED";
    verifiedAt?: NativeDate | null;
    verifiedBy?: string | null;
    status: "ACTIVE" | "RESOLVED";
    source: string;
    startedAt: NativeDate;
    resolvedAt?: NativeDate | null;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, {
    timestamps: true;
}> & Omit<{
    type: string;
    title: string;
    description?: string | null;
    location: {
        type: "Point";
        coordinates: number[];
    };
    severity: "CRITICAL" | "HIGH" | "LOW" | "MEDIUM";
    roadStatus: "BLOCKED" | "OPEN" | "PARTIALLY_AVAILABLE";
    verificationStatus: "PENDING" | "REJECTED" | "VERIFIED";
    verifiedAt?: NativeDate | null;
    verifiedBy?: string | null;
    status: "ACTIVE" | "RESOLVED";
    source: string;
    startedAt: NativeDate;
    resolvedAt?: NativeDate | null;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    type: string;
    title: string;
    description?: string | null;
    location: {
        type: "Point";
        coordinates: number[];
    };
    severity: "CRITICAL" | "HIGH" | "LOW" | "MEDIUM";
    roadStatus: "BLOCKED" | "OPEN" | "PARTIALLY_AVAILABLE";
    verificationStatus: "PENDING" | "REJECTED" | "VERIFIED";
    verifiedAt?: NativeDate | null;
    verifiedBy?: string | null;
    status: "ACTIVE" | "RESOLVED";
    source: string;
    startedAt: NativeDate;
    resolvedAt?: NativeDate | null;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, {
    type: string;
    title: string;
    description?: string | null;
    location: {
        type: "Point";
        coordinates: number[];
    };
    severity: "CRITICAL" | "HIGH" | "LOW" | "MEDIUM";
    roadStatus: "BLOCKED" | "OPEN" | "PARTIALLY_AVAILABLE";
    verificationStatus: "PENDING" | "REJECTED" | "VERIFIED";
    verifiedAt?: NativeDate | null;
    verifiedBy?: string | null;
    status: "ACTIVE" | "RESOLVED";
    source: string;
    startedAt: NativeDate;
    resolvedAt?: NativeDate | null;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, Omit<mongoose.DefaultSchemaOptions, "timestamps"> & {
    timestamps: true;
}> & Omit<{
    type: string;
    title: string;
    description?: string | null;
    location: {
        type: "Point";
        coordinates: number[];
    };
    severity: "CRITICAL" | "HIGH" | "LOW" | "MEDIUM";
    roadStatus: "BLOCKED" | "OPEN" | "PARTIALLY_AVAILABLE";
    verificationStatus: "PENDING" | "REJECTED" | "VERIFIED";
    verifiedAt?: NativeDate | null;
    verifiedBy?: string | null;
    status: "ACTIVE" | "RESOLVED";
    source: string;
    startedAt: NativeDate;
    resolvedAt?: NativeDate | null;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, unknown, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    type: string;
    title: string;
    description?: string | null;
    location: {
        type: "Point";
        coordinates: number[];
    };
    severity: "CRITICAL" | "HIGH" | "LOW" | "MEDIUM";
    roadStatus: "BLOCKED" | "OPEN" | "PARTIALLY_AVAILABLE";
    verificationStatus: "PENDING" | "REJECTED" | "VERIFIED";
    verifiedAt?: NativeDate | null;
    verifiedBy?: string | null;
    status: "ACTIVE" | "RESOLVED";
    source: string;
    startedAt: NativeDate;
    resolvedAt?: NativeDate | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
    type: string;
    title: string;
    description?: string | null;
    location: {
        type: "Point";
        coordinates: number[];
    };
    severity: "CRITICAL" | "HIGH" | "LOW" | "MEDIUM";
    roadStatus: "BLOCKED" | "OPEN" | "PARTIALLY_AVAILABLE";
    verificationStatus: "PENDING" | "REJECTED" | "VERIFIED";
    verifiedAt?: NativeDate | null;
    verifiedBy?: string | null;
    status: "ACTIVE" | "RESOLVED";
    source: string;
    startedAt: NativeDate;
    resolvedAt?: NativeDate | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=incident.model.d.ts.map