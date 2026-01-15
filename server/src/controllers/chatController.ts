import { Request, Response } from 'express';
import { geminiModel } from '../config/gemini';
import { query } from '../db';
import logger from '../utils/logger';

// Input validation constants
const MAX_MESSAGE_LENGTH = 10000;
const MAX_HISTORY_LENGTH = 50;

// Sanitize input
const sanitizeInput = (input: string): string => {
    return input
        .trim()
        .slice(0, MAX_MESSAGE_LENGTH)
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

// Validate message structure
const isValidMessage = (msg: any): boolean => {
    return msg &&
        typeof msg.role === 'string' &&
        typeof msg.content === 'string' &&
        ['user', 'assistant'].includes(msg.role);
};

// STREAMING CHAT ENDPOINT - Types like ChatGPT
export const chatWithAIStream = async (req: Request, res: Response): Promise<void> => {
    try {
        const { message, previousMessages } = req.body;

        // Input validation
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        const sanitizedMessage = sanitizeInput(message);

        // Validate history
        let validHistory: { role: string; content: string }[] = [];
        if (Array.isArray(previousMessages)) {
            validHistory = previousMessages
                .filter(isValidMessage)
                .slice(-MAX_HISTORY_LENGTH)
                .map(m => ({ role: m.role, content: sanitizeInput(m.content) }));
        }

        const isMockMode = process.env.MOCK_MODE === 'true';

        // Save user message to DB
        if (!isMockMode && process.env.DATABASE_URL) {
            try {
                await query('INSERT INTO messages (role, content) VALUES ($1, $2)', ['user', sanitizedMessage]);
            } catch (dbError) {
                logger.error('DB Error saving user message:', dbError);
            }
        }

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        let fullResponse = '';

        if (isMockMode) {
            // Mock streaming response
            const mockResponse = `Hello! I received your message: "${sanitizedMessage}". This is a mock response streaming word by word.`;
            const words = mockResponse.split(' ');

            for (const word of words) {
                fullResponse += word + ' ';
                res.write(`data: ${JSON.stringify({ text: word + ' ', done: false })}\n\n`);
                await new Promise(r => setTimeout(r, 50));
            }

            res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
            res.end();
        } else {
            try {
                if (!process.env.GEMINI_API_KEY) throw new Error("Missing Gemini API Key");

                // Build prompt
                const historyText = validHistory
                    .map(m => `${m.role}: ${m.content}`)
                    .join('\n');

                const systemPrompt = `You are Smart Assistant, a helpful AI assistant created by Hariz. Be concise and helpful.`;
                const prompt = historyText
                    ? `${systemPrompt}\n\nConversation:\n${historyText}\n\nUser: ${sanitizedMessage}\n\nAssistant:`
                    : `${systemPrompt}\n\nUser: ${sanitizedMessage}\n\nAssistant:`;

                // Use streaming API
                const result = await geminiModel.generateContentStream(prompt);

                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    if (text) {
                        fullResponse += text;
                        res.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
                    }
                }

                // Send done signal
                res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
                res.end();

                logger.info(`Streamed response: ${fullResponse.length} chars`);

            } catch (aiError: any) {
                logger.error("Gemini streaming error:", aiError.message);
                res.write(`data: ${JSON.stringify({ error: 'AI error occurred', done: true })}\n\n`);
                res.end();
                return;
            }
        }

        // Save full response to DB
        if (!isMockMode && process.env.DATABASE_URL && fullResponse) {
            try {
                await query('INSERT INTO messages (role, content) VALUES ($1, $2)', ['assistant', fullResponse]);
            } catch (dbError) {
                logger.error('DB Error saving AI message:', dbError);
            }
        }

    } catch (error: any) {
        logger.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Server error', done: true })}\n\n`);
        res.end();
    }
};

// Regular chat endpoint (non-streaming fallback)
export const chatWithAI = async (req: Request, res: Response): Promise<void> => {
    try {
        const { message, previousMessages } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        const sanitizedMessage = sanitizeInput(message);
        const isMockMode = process.env.MOCK_MODE === 'true';

        // Save user message
        if (!isMockMode && process.env.DATABASE_URL) {
            try {
                await query('INSERT INTO messages (role, content) VALUES ($1, $2)', ['user', sanitizedMessage]);
            } catch (e) { }
        }

        let reply = '';

        if (isMockMode) {
            reply = `Mock response for: "${sanitizedMessage}"`;
        } else {
            const historyText = (previousMessages || [])
                .filter(isValidMessage)
                .slice(-MAX_HISTORY_LENGTH)
                .map((m: any) => `${m.role}: ${m.content}`)
                .join('\n');

            const prompt = historyText
                ? `You are Smart Assistant. Conversation:\n${historyText}\n\nUser: ${sanitizedMessage}\n\nAssistant:`
                : `You are Smart Assistant. User: ${sanitizedMessage}\n\nAssistant:`;

            const result = await geminiModel.generateContent(prompt);
            reply = result.response.text();
        }

        // Save response
        if (!isMockMode && process.env.DATABASE_URL) {
            try {
                await query('INSERT INTO messages (role, content) VALUES ($1, $2)', ['assistant', reply]);
            } catch (e) { }
        }

        res.json({ reply });
    } catch (error: any) {
        logger.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
};

export const getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const isMockMode = process.env.MOCK_MODE === 'true';

        if (!isMockMode && process.env.DATABASE_URL) {
            const result = await query('SELECT role, content FROM messages ORDER BY created_at ASC LIMIT 100');
            res.json(result.rows);
        } else {
            res.json([]);
        }
    } catch (error) {
        logger.error("History error:", error);
        res.status(500).json({ error: "Failed to fetch history" });
    }
};

export const clearHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        if (process.env.DATABASE_URL) {
            await query('DELETE FROM messages');
            res.json({ success: true });
        } else {
            res.json({ success: true });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to clear history" });
    }
};
