import { Request, Response } from 'express';
import { query } from '../db';
import logger from '../utils/logger';
import bcrypt from 'bcryptjs';

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(`
            SELECT 
                id, 
                email, 
                name, 
                avatar_url,
                created_at,
                updated_at,
                last_login
            FROM users 
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            count: result.rows.length,
            users: result.rows.map(user => ({
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatar_url,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
                lastLogin: user.last_login
            }))
        });

    } catch (error: any) {
        logger.error('Get all users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
};

// Export users to CSV
export const exportUsersToCSV = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(`
            SELECT 
                id, 
                email, 
                name,
                created_at,
                last_login
            FROM users 
            ORDER BY created_at DESC
        `);

        // Create CSV content
        const headers = ['ID', 'Email', 'Name', 'Created At', 'Last Login'];
        const csvRows = [headers.join(',')];

        result.rows.forEach(user => {
            const row = [
                user.id,
                `"${user.email}"`,
                `"${user.name}"`,
                user.created_at ? new Date(user.created_at).toISOString() : '',
                user.last_login ? new Date(user.last_login).toISOString() : 'Never'
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=users_${Date.now()}.csv`);
        res.send(csvContent);

    } catch (error: any) {
        logger.error('Export users error:', error);
        res.status(500).json({ error: 'Failed to export users' });
    }
};

// Get user statistics
export const getUserStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const totalUsers = await query('SELECT COUNT(*) as count FROM users');
        const todayUsers = await query(`
            SELECT COUNT(*) as count FROM users 
            WHERE created_at >= CURRENT_DATE
        `);
        const activeUsers = await query(`
            SELECT COUNT(*) as count FROM users 
            WHERE last_login >= NOW() - INTERVAL '7 days'
        `);

        // Get total usage time across all users
        const totalUsageTime = await query(`
            SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds
            FROM user_sessions
        `);

        res.json({
            success: true,
            stats: {
                totalUsers: parseInt(totalUsers.rows[0].count),
                usersToday: parseInt(todayUsers.rows[0].count),
                activeUsersLast7Days: parseInt(activeUsers.rows[0].count),
                totalUsageSeconds: parseInt(totalUsageTime.rows[0].total_seconds || 0)
            }
        });

    } catch (error: any) {
        logger.error('Get user stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
};

// Get user analytics with usage time
export const getUserAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(`
            SELECT 
                u.id,
                u.email,
                u.name,
                u.created_at,
                u.last_login,
                COALESCE(SUM(s.duration_seconds), 0) as total_usage_seconds,
                COUNT(DISTINCT s.id) as session_count,
                MAX(s.session_start) as last_session
            FROM users u
            LEFT JOIN user_sessions s ON u.id = s.user_id
            GROUP BY u.id, u.email, u.name, u.created_at, u.last_login
            ORDER BY total_usage_seconds DESC
        `);

        res.json({
            success: true,
            analytics: result.rows.map(row => ({
                id: row.id,
                email: row.email,
                name: row.name,
                createdAt: row.created_at,
                lastLogin: row.last_login,
                totalUsageSeconds: parseInt(row.total_usage_seconds),
                sessionCount: parseInt(row.session_count),
                lastSession: row.last_session
            }))
        });

    } catch (error: any) {
        logger.error('Get user analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
};

// Start a user session
export const startSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // End any active sessions for this user
        await query(`
            UPDATE user_sessions 
            SET session_end = NOW(), 
                duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))::INTEGER,
                is_active = false
            WHERE user_id = $1 AND is_active = true
        `, [userId]);

        // Start new session
        const result = await query(`
            INSERT INTO user_sessions (user_id, session_start, is_active)
            VALUES ($1, NOW(), true)
            RETURNING id
        `, [userId]);

        res.json({
            success: true,
            sessionId: result.rows[0].id
        });

    } catch (error: any) {
        logger.error('Start session error:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
};

// End a user session
export const endSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // End all active sessions for this user
        await query(`
            UPDATE user_sessions 
            SET session_end = NOW(), 
                duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))::INTEGER,
                is_active = false
            WHERE user_id = $1 AND is_active = true
        `, [userId]);

        res.json({ success: true });

    } catch (error: any) {
        logger.error('End session error:', error);
        res.status(500).json({ error: 'Failed to end session' });
    }
};

// Heartbeat to keep session alive and update duration
export const sessionHeartbeat = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Update session duration
        await query(`
            UPDATE user_sessions 
            SET duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))::INTEGER
            WHERE user_id = $1 AND is_active = true
        `, [userId]);

        res.json({ success: true });

    } catch (error: any) {
        logger.error('Session heartbeat error:', error);
        res.status(500).json({ error: 'Failed to update session' });
    }
};

// Delete a user (admin only)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const adminEmail = process.env.ADMIN_EMAIL || 'smarthari.2810@gmail.com';

        // Get user to check if it's admin
        const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);

        if (userResult.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Prevent deleting admin account
        if (userResult.rows[0].email.toLowerCase() === adminEmail.toLowerCase()) {
            res.status(403).json({ error: 'Cannot delete admin account' });
            return;
        }

        // Delete user (cascade will delete sessions and messages)
        await query('DELETE FROM users WHERE id = $1', [userId]);

        logger.info(`User ${userId} deleted by admin`);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error: any) {
        logger.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// Reset user password (admin only)
export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }

        // Check if user exists
        const userResult = await query('SELECT email, name FROM users WHERE id = $1', [userId]);

        if (userResult.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update password
        await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);

        logger.info(`Password reset for user ${userId} by admin`);

        res.json({
            success: true,
            message: `Password reset successfully for ${userResult.rows[0].name}`
        });

    } catch (error: any) {
        logger.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};
