import mongoose from 'mongoose';
export declare const geoPointSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    _id: false;
}, {
    type: "Point";
    coordinates: number[];
}, mongoose.Document<unknown, {}, {
    type: "Point";
    coordinates: number[];
}, {
    id: string;
}, Omit<mongoose.DefaultSchemaOptions, "_id"> & {
    _id: false;
}> & Omit<{
    type: "Point";
    coordinates: number[];
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & mongoose.HydratedDocumentOverrides<{
    id: string;
}>, unknown, {
    type: "Point";
    coordinates: number[];
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=common.model.d.ts.map