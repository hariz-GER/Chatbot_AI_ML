import { Router } from 'express';
import { generateImage, getImageProviders } from '../controllers/imageController';
import { chatLimiter } from '../middleware/security';

const router = Router();

// Generate image endpoint
router.post('/generate', chatLimiter, generateImage);

// Get available providers
router.get('/providers', getImageProviders);

export default router;
