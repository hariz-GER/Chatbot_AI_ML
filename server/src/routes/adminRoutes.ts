import { Router } from 'express';
import { getAllUsers, exportUsersToCSV, getUserStats } from '../controllers/adminController';

const router = Router();

// Admin routes - In production, add proper admin authentication
router.get('/users', getAllUsers);
router.get('/users/export', exportUsersToCSV);
router.get('/stats', getUserStats);

export default router;
