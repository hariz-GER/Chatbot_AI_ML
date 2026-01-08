import { Request, Response } from 'express';
import { openai } from '../config/openai';
import { query } from '../db';

export const chatWithAI = async (req: Request, res: Response): Promise<void> => {
    try {
        const { message, previousMessages } = req.body;

        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        const isMockMode = process.env.MOCK_MODE === 'true';

        // Save user message to DB
        if (!isMockMode && process.env.DATABASE_URL) {
            try {
                await query('INSERT INTO messages (role, content) VALUES ($1, $2)', ['user', message]);
            } catch (dbError) {
                console.error('DB Error saving user message:', dbError);
            }
        }

        // Construct conversation history for context
        const messages = [
            { role: "system", content: "You are a helpful AI assistant." },
            ...(previousMessages || []),
            { role: "user", content: message }
        ];

        let reply: string | null = "";

        if (isMockMode) {
            console.log("MOCK MODE: Simulating AI response");
            await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
            reply = "Hello! I am currently running in Mock Mode. I received: \"" + message + "\". (Database and OpenAI are disabled)";
        } else {
            // Try to get response from OpenAI
            try {
                if (!process.env.OPENAI_API_KEY) throw new Error("Missing OpenAI API Key");

                const completion = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: messages as any,
                });
                reply = completion.choices[0].message.content;
            } catch (aiError: any) {
                // Fallback if API fails
                console.error("OpenAI API Error Details:");
                console.error("  - Error Type:", aiError?.constructor?.name);
                console.error("  - Message:", aiError?.message);
                console.error("  - Status:", aiError?.status);
                console.error("  - Full Error:", JSON.stringify(aiError, null, 2));
                await new Promise(resolve => setTimeout(resolve, 800));
                reply = "I encountered an error connecting to my brain. But I heard you say: \"" + message + "\"";
            }
        }

        // Save AI response to DB
        if (!isMockMode && process.env.DATABASE_URL) {
            try {
                await query('INSERT INTO messages (role, content) VALUES ($1, $2)', ['assistant', reply]);
            } catch (dbError) {
                console.error('DB Error saving AI message:', dbError);
            }
        }

        res.json({ reply });
    } catch (error: any) {
        console.error('Server Error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
};

export const getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const isMockMode = process.env.MOCK_MODE === 'true';

        if (!isMockMode && process.env.DATABASE_URL) {
            const result = await query('SELECT role, content FROM messages ORDER BY created_at ASC');
            res.json(result.rows);
        } else {
            // Return dummy history if no DB or in Mock Mode
            res.json([
                { role: 'assistant', content: 'Welcome! I am your AI assistant (Mock Mode). How can I help you today?' }
            ]);
        }
    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ error: "Failed to fetch history" });
    }
};
