import jwt from 'jsonwebtoken';
import { User } from '../models/auth.model.js';
import { UserStatus } from '../types/auth.types.js';
async function authMiddleware(req, res, next) {
    try {
        const authorization = req.headers.authorization;
        const bearerToken = authorization?.startsWith('Bearer ')
            ? authorization.slice(7)
            : undefined;
        const token = req.cookies?.token ?? bearerToken;
        if (!token) {
            res.status(401).json({ message: 'Unauthorized: token is missing' });
            return;
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({ message: 'JWT secret is not configured' });
            return;
        }
        const decoded = jwt.verify(token, secret);
        if (typeof decoded === 'string' || typeof decoded.id !== 'string') {
            res.status(401).json({ message: 'Unauthorized: invalid token' });
            return;
        }
        const user = await User.findById(decoded.id);
        if (!user || user.status !== UserStatus.ACTIVE) {
            res.status(401).json({ message: 'Unauthorized: user is not active' });
            return;
        }
        req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            ...(user.phone ? { phone: user.phone } : {}),
            ...(user.lastLoginAt ? { lastLoginAt: user.lastLoginAt } : {}),
        };
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ message: 'Unauthorized: invalid token' });
    }
}
export { authMiddleware };
//# sourceMappingURL=auth.middleware.js.map