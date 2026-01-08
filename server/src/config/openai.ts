import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set in environment variables.");
}

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
