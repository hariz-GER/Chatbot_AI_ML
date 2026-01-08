import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const initDb = async () => {
    if (!process.env.DATABASE_URL) {
        console.warn("DATABASE_URL is not set. Skipping database initialization.");
        return;
    }

    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      role VARCHAR(10) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // test
    try {
        await pool.query(createTableQuery);
        console.log("Database initialized successfully.");
    } catch (error) {
        console.error("Error iniing database:", error);
    }
};
