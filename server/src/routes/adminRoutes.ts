import { Router, Request, Response, NextFunction } from 'express';
import { getAllUsers, exportUsersToCSV, getUserStats } from '../controllers/adminController';
import { adminMiddleware } from '../middleware/auth';
import jwt from 'jsonwebtoken';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'smarthari.2810@gmail.com';

// Middleware that also checks query param token (for downloads)
const adminMiddlewareWithQuery = (req: Request, res: Response, next: NextFunction): void => {
    try {
        // Check header first, then query param
        let token = req.headers.authorization?.replace('Bearer ', '');
        if (!token && req.query.token) {
            token = req.query.token as string;
        }

        if (!token) {
            res.status(401).json({ error: 'Admin authentication required' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { email: string };

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

// Admin routes - Protected with admin authentication
router.get('/users', adminMiddleware, getAllUsers);
router.get('/users/export', adminMiddlewareWithQuery, exportUsersToCSV);
router.get('/stats', adminMiddleware, getUserStats);

// Check if current user is admin (public endpoint for frontend)
router.get('/check', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        res.json({ isAdmin: false });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
        res.json({ isAdmin: decoded.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() });
    } catch {
        res.json({ isAdmin: false });
    }
});

export default router;
