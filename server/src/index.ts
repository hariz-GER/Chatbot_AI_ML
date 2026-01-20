import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import chatRoutes from './routes/chatRoutes';
import imageRoutes from './routes/imageRoutes';
import authRoutes from './routes/authRoutes';
import { initDb } from './db';
import logger from './utils/logger';
import {
    apiLimiter,
    securityHeaders,
    requestLogger,
    errorHandler,
    validateEnv
} from './middleware/security';

const app = express();
const port = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

// Validate environment
validateEnv();

// Security middleware
if (isProduction) {
    app.use(securityHeaders);
}

// CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression for responses
app.use(compression());

// Parse JSON with size limit
app.use(express.json({ limit: '10kb' }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api', chatRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Smart Assistant API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            chat: '/api/chat',
            image: '/api/image/generate',
            health: '/health'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = () => {
    logger.info('Received shutdown signal, closing server...');
    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
app.listen(port, () => {
    logger.info(`🚀 Server is running at http://localhost:${port}`);
    logger.info(`📊 Environment: ${isProduction ? 'production' : 'development'}`);

    // Initialize database
    initDb().catch(err => {
        logger.error('Failed to initialize database:', err);
    });
});

export default app;
