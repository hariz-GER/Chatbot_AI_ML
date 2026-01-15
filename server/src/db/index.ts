import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Connection pool with optimized settings
const pool = process.env.DATABASE_URL ? new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of clients
    idleTimeoutMillis: 30000, // Close idle clients after 30s
    connectionTimeoutMillis: 5000, // Return error after 5s if no connection
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}) : null;

// Track pool events
if (pool) {
    pool.on('error', (err) => {
        console.error('Unexpected database pool error:', err);
    });

    pool.on('connect', () => {
        console.log('New database connection established');
    });
}

// Query helper with error handling
export const query = async (text: string, params?: any[]) => {
    if (!pool) {
        throw new Error('Database not configured');
    }

    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;

        // Log slow queries (> 100ms)
        if (duration > 100) {
            console.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
        }

        return result;
    } catch (error: any) {
        console.error('Database query error:', {
            query: text.substring(0, 100),
            error: error.message
        });
        throw error;
    }
};

// Get a client from pool for transactions
export const getClient = async (): Promise<PoolClient | null> => {
    if (!pool) return null;
    return pool.connect();
};

// Health check
export const checkConnection = async (): Promise<boolean> => {
    if (!pool) return false;

    try {
        await pool.query('SELECT 1');
        return true;
    } catch {
        return false;
    }
};

// Initialize database
export const initDb = async () => {
    if (!process.env.DATABASE_URL) {
        console.warn("DATABASE_URL is not set. Running without database persistence.");
        return;
    }

    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
  `;

    try {
        await pool!.query(createTableQuery);
        console.log("✅ Database initialized successfully.");
    } catch (error) {
        console.error("❌ Error initializing database:", error);
        throw error;
    }
};

// Graceful shutdown
export const closePool = async () => {
    if (pool) {
        await pool.end();
        console.log('Database pool closed');
    }
};
