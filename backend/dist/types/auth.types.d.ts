import type { Request } from 'express';
import type { ObjectId } from 'mongodb';
export declare const Role: {
    readonly ADMIN: 'ADMIN';
    readonly DISPATCHER: 'DISPATCHER';
    readonly DRIVER: 'DRIVER';
    readonly USER: 'USER';
};
export type Role = (typeof Role)[keyof typeof Role];
export declare const UserStatus: {
    readonly ACTIVE: 'ACTIVE';
    readonly INACTIVE: 'INACTIVE';
    readonly SUSPENDED: 'SUSPENDED';
};
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
export interface UserDocument {
    _id: ObjectId;
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
    status: UserStatus;
    phone?: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
}
export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: UserStatus;
    phone?: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
}
export interface SessionData {
    sessionId: string;
    userId: string;
    email: string;
    name: string;
    role: Role;
    ip: string;
    userAgent: string;
    createdAt: number;
    lastActiveAt: number;
}
export interface AuthenticatedRequest extends Request {
    user?: UserProfile;
    sessionId?: string;
    sessionData?: SessionData;
}
//# sourceMappingURL=auth.types.d.ts.map