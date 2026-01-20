import { Request, Response } from 'express';
import { query } from '../db';
import logger from '../utils/logger';

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

        res.json({
            success: true,
            stats: {
                totalUsers: parseInt(totalUsers.rows[0].count),
                usersToday: parseInt(todayUsers.rows[0].count),
                activeUsersLast7Days: parseInt(activeUsers.rows[0].count)
            }
        });

    } catch (error: any) {
        logger.error('Get user stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
};
