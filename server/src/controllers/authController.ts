import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

interface UserPayload {
    id: number;
    email: string;
    name: string;
}

// Generate JWT token
const generateToken = (user: UserPayload): string => {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

// Sign Up
export const signup = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name } = req.body;

        // Validation
        if (!email || !password || !name) {
            res.status(400).json({ error: 'Email, password, and name are required' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }

        // Check if user exists
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const result = await query(
            'INSERT INTO users (email, password_hash, name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, name, created_at',
            [email.toLowerCase(), passwordHash, name]
        );

        const user = result.rows[0];
        const token = generateToken(user);

        logger.info(`New user registered: ${email}`);

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.created_at
            },
            token
        });

    } catch (error: any) {
        logger.error('Signup error:', error.message || error);

        // Return more specific error for debugging
        if (error.code === '42P01') {
            res.status(500).json({ error: 'Database tables not initialized. Please restart the server.' });
        } else if (error.code === '23505') {
            res.status(409).json({ error: 'Email already registered' });
        } else {
            res.status(500).json({ error: 'Failed to create account', details: error.message });
        }
    }
};

// Login
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        // Find user
        const result = await query(
            'SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        const user = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        // Update last login
        await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        const token = generateToken(user);

        logger.info(`User logged in: ${email}`);

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.created_at
            },
            token
        });

    } catch (error: any) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const result = await query(
            'SELECT id, email, name, avatar_url, created_at, last_login FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const user = result.rows[0];

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatar_url,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        });

    } catch (error: any) {
        logger.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
};

// Update profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        const { name, avatarUrl } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const result = await query(
            'UPDATE users SET name = COALESCE($1, name), avatar_url = COALESCE($2, avatar_url), updated_at = NOW() WHERE id = $3 RETURNING id, email, name, avatar_url',
            [name, avatarUrl, userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({
            success: true,
            message: 'Profile updated',
            user: result.rows[0]
        });

    } catch (error: any) {
        logger.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

// Verify token (for frontend auth check)
export const verifyToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({ valid: false, error: 'No token provided' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;

        // Check if user still exists
        const result = await query('SELECT id, email, name FROM users WHERE id = $1', [decoded.id]);

        if (result.rows.length === 0) {
            res.status(401).json({ valid: false, error: 'User not found' });
            return;
        }

        res.json({
            valid: true,
            user: result.rows[0]
        });

    } catch (error: any) {
        res.status(401).json({ valid: false, error: 'Invalid token' });
    }
};
