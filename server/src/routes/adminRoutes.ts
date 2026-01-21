import { Router, Request, Response, NextFunction } from 'express';
import { getAllUsers, exportUsersToCSV, getUserStats, getUserAnalytics, startSession, endSession, sessionHeartbeat, deleteUser, resetUserPassword } from '../controllers/adminController';
import { adminMiddleware, authMiddleware } from '../middleware/auth';
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
router.get('/analytics', adminMiddleware, getUserAnalytics);

// User management routes (admin only)
router.delete('/users/:userId', adminMiddleware, deleteUser);
router.post('/users/:userId/reset-password', adminMiddleware, resetUserPassword);

// Session tracking routes - For logged in users
router.post('/session/start', authMiddleware, startSession);
router.post('/session/end', authMiddleware, endSession);
router.post('/session/heartbeat', authMiddleware, sessionHeartbeat);

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
