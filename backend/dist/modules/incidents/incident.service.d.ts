export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RoadStatus = 'OPEN' | 'PARTIALLY_AVAILABLE' | 'BLOCKED';
export declare const getRoadStatus: (severity: IncidentSeverity) => RoadStatus;
export declare const getIncidentsForAi: () => Promise<({
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
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & Required<{
    _id: import("mongoose").Types.ObjectId;
}>)[]>;
//# sourceMappingURL=incident.service.d.ts.map