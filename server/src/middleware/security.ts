import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Rate limiter for API endpoints
export const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute per IP
    message: {
        error: 'Too many requests, please try again later.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many requests, please try again later.',
            retryAfter: 60
        });
    }
});

// Stricter rate limiter for chat endpoint
export const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 15, // 15 chat requests per minute
    message: {
        error: 'You are sending messages too quickly. Please slow down.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Helmet security headers
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
});

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });

    next();
};

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`Error: ${err.message}`, { stack: err.stack });

    res.status(500).json({
        error: 'An internal server error occurred',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

// Validate environment variables
export const validateEnv = () => {
    const required = ['GEMINI_API_KEY'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        logger.warn(`Missing environment variables: ${missing.join(', ')}`);
    }

    return missing.length === 0;
};
