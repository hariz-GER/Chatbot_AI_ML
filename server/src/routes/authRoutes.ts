import { Router } from 'express';
import { signup, login, getProfile, updateProfile, verifyToken } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { apiLimiter } from '../middleware/security';

const router = Router();

// Public routes
router.post('/signup', apiLimiter, signup);
router.post('/login', apiLimiter, login);
router.get('/verify', verifyToken);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

export default router;
