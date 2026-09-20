import mongoose from 'mongoose';
import { type UserDocument } from '../types/auth.types.js';
export declare const User: mongoose.Model<UserDocument, {}, {}, {}, mongoose.Document<unknown, {}, UserDocument, {}, mongoose.DefaultSchemaOptions> & UserDocument & Required<{
    _id: mongoose.mongo.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, UserDocument>;
//# sourceMappingURL=auth.model.d.ts.map