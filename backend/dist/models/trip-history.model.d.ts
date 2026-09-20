import mongoose from 'mongoose';
export declare const TripHistory: mongoose.Model<{
    shipmentId: mongoose.Types.ObjectId;
    vehicleId: mongoose.Types.ObjectId;
    routeId?: mongoose.Types.ObjectId | null;
    distanceKm: number;
    plannedDurationMinutes: number;
    actualDurationMinutes: number;
    delayMinutes: number;
    trafficLevel: string;
    weather?: any;
    incidentCount: number;
    roadCondition: string;
    averageSpeedKmh: number;
    startedAt: NativeDate;
    completedAt: NativeDate;
}, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    shipmentId: mongoose.Types.ObjectId;
    vehicleId: mongoose.Types.ObjectId;
    routeId?: mongoose.Types.ObjectId | null;
    distanceKm: number;
    plannedDurationMinutes: number;
    actualDurationMinutes: number;
    delayMinutes: number;
    trafficLevel: string;
    weather?: any;
    incidentCount: number;
    roadCondition: string;
    averageSpeedKmh: number;
    startedAt: NativeDate;
    completedAt: NativeDate;
}, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<{
    shipmentId: mongoose.Types.ObjectId;
    vehicleId: mongoose.Types.ObjectId;
    routeId?: mongoose.Types.ObjectId | null;
    distanceKm: number;
    plannedDurationMinutes: number;
    actualDurationMinutes: number;
    delayMinutes: number;
    trafficLevel: string;
    weather?: any;
    incidentCount: number;
    roadCondition: string;
    averageSpeedKmh: number;
    startedAt: NativeDate;
    completedAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    shipmentId: mongoose.Types.ObjectId;
    vehicleId: mongoose.Types.ObjectId;
    routeId?: mongoose.Types.ObjectId | null;
    distanceKm: number;
    plannedDurationMinutes: number;
    actualDurationMinutes: number;
    delayMinutes: number;
    trafficLevel: string;
    weather?: any;
    incidentCount: number;
    roadCondition: string;
    averageSpeedKmh: number;
    startedAt: NativeDate;
    completedAt: NativeDate;
}, mongoose.Document<unknown, {}, {
    shipmentId: mongoose.Types.ObjectId;
    vehicleId: mongoose.Types.ObjectId;
    routeId?: mongoose.Types.ObjectId | null;
    distanceKm: number;
    plannedDurationMinutes: number;
    actualDurationMinutes: number;
    delayMinutes: number;
    trafficLevel: string;
    weather?: any;
    incidentCount: number;
    roadCondition: string;
    averageSpeedKmh: number;
    startedAt: NativeDate;
    completedAt: NativeDate;
}, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<{
    shipmentId: mongoose.Types.ObjectId;
    vehicleId: mongoose.Types.ObjectId;
    routeId?: mongoose.Types.ObjectId | null;
    distanceKm: number;
    plannedDurationMinutes: number;
    actualDurationMinutes: number;
    delayMinutes: number;
    trafficLevel: string;
    weather?: any;
    incidentCount: number;
    roadCondition: string;
    averageSpeedKmh: number;
    startedAt: NativeDate;
    completedAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, unknown, {
    shipmentId: mongoose.Types.ObjectId;
    vehicleId: mongoose.Types.ObjectId;
    routeId?: mongoose.Types.ObjectId | null;
    distanceKm: number;
    plannedDurationMinutes: number;
    actualDurationMinutes: number;
    delayMinutes: number;
    trafficLevel: string;
    weather?: any;
    incidentCount: number;
    roadCondition: string;
    averageSpeedKmh: number;
    startedAt: NativeDate;
    completedAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    shipmentId: mongoose.Types.ObjectId;
    vehicleId: mongoose.Types.ObjectId;
    routeId?: mongoose.Types.ObjectId | null;
    distanceKm: number;
    plannedDurationMinutes: number;
    actualDurationMinutes: number;
    delayMinutes: number;
    trafficLevel: string;
    weather?: any;
    incidentCount: number;
    roadCondition: string;
    averageSpeedKmh: number;
    startedAt: NativeDate;
    completedAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=trip-history.model.d.ts.map