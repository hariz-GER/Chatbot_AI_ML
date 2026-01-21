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

    try {
        // Create users table first
        await pool!.query(`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              email VARCHAR(255) UNIQUE NOT NULL,
              password_hash VARCHAR(255) NOT NULL,
              name VARCHAR(100) NOT NULL,
              avatar_url VARCHAR(500),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              last_login TIMESTAMP
            );
        `);

        await pool!.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);

        // Check if messages table exists
        const messagesTableExists = await pool!.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'messages'
            );
        `);

        if (messagesTableExists.rows[0].exists) {
            // Add user_id column if it doesn't exist
            await pool!.query(`
                ALTER TABLE messages 
                ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
            `).catch(() => {
                // Column might already exist, ignore error
            });
        } else {
            // Create messages table with user_id
            await pool!.query(`
                CREATE TABLE messages (
                  id SERIAL PRIMARY KEY,
                  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
                  content TEXT NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
        }

        await pool!.query(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);`);

        // Try to create user_id index (may fail if column doesn't exist)
        await pool!.query(`CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);`).catch(() => { });

        // Create conversations table
        await pool!.query(`
            CREATE TABLE IF NOT EXISTS conversations (
              id SERIAL PRIMARY KEY,
              user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
              title VARCHAR(255) DEFAULT 'New Chat',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool!.query(`CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);`);

        // Create user_sessions table for tracking activity
        await pool!.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
              id SERIAL PRIMARY KEY,
              user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
              session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              session_end TIMESTAMP,
              duration_seconds INTEGER DEFAULT 0,
              is_active BOOLEAN DEFAULT true
            );
        `);

        await pool!.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);`);
        await pool!.query(`CREATE INDEX IF NOT EXISTS idx_sessions_start ON user_sessions(session_start);`);

        console.log("✅ Database initialized successfully.");
    } catch (error) {
        console.error("❌ Error initializing database:", error);
        // Don't throw - let the app continue running
    }
};

// Graceful shutdown
export const closePool = async () => {
    if (pool) {
        await pool.end();
        console.log('Database pool closed');
    }
};
