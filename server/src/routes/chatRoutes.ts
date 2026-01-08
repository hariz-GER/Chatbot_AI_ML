import { Router } from 'express';
import { chatWithAI, getHistory } from '../controllers/chatController';

const router = Router();

router.post('/chat', chatWithAI);
router.get('/history', getHistory);

export default router;
