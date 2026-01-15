import { Router } from 'express';
import { chatWithAI, chatWithAIStream, getHistory, clearHistory } from '../controllers/chatController';
import { chatLimiter } from '../middleware/security';

const router = Router();

// Streaming chat endpoint (like ChatGPT)
router.post('/chat/stream', chatLimiter, chatWithAIStream);

// Regular chat endpoint (fallback)
router.post('/chat', chatLimiter, chatWithAI);

// History endpoints
router.get('/history', getHistory);
router.delete('/history', clearHistory);

export default router;
