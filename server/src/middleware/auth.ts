import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
// Admin email - only this user can access admin routes
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'smarthari.2810@gmail.com';

interface UserPayload {
    id: number;
    email: string;
    name: string;
}

// Middleware to verify JWT token
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
        (req as any).user = decoded;
        next();

    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Admin-only middleware - requires authentication + admin email
export const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({ error: 'Admin authentication required' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;

        // Check if user is admin
        if (decoded.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            res.status(403).json({ error: 'Access denied. Admin privileges required.' });
            return;
        }

        (req as any).user = decoded;
        next();

    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Check if email is admin (for frontend use)
export const isAdminEmail = (email: string): boolean => {
    return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

// Optional auth - doesn't require token but attaches user if present
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
            (req as any).user = decoded;
        }
    } catch (error) {
        // Token invalid, continue without user
    }
    next();
};
