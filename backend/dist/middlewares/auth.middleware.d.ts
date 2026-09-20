import type { NextFunction, Response } from 'express';
import { type AuthenticatedRequest } from '../types/auth.types.js';
declare function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
export { authMiddleware };
//# sourceMappingURL=auth.middleware.d.ts.map