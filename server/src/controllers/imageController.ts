import { Request, Response } from 'express';
import logger from '../utils/logger';

// Hugging Face API endpoints
const HUGGINGFACE_FLUX_URL = 'https://router.huggingface.co/together/v1/images/generations';
const HUGGINGFACE_SD_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

// Input validation
const MAX_PROMPT_LENGTH = 500;

const sanitizePrompt = (prompt: string): string => {
    return prompt
        .trim()
        .slice(0, MAX_PROMPT_LENGTH)
        .replace(/<[^>]*>/g, ''); // Remove HTML tags
};

// Generate image
export const generateImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }

        const sanitizedPrompt = sanitizePrompt(prompt);

        // Check for API keys (support both env variable names)
        const hfApiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
        const openaiApiKey = process.env.OPENAI_API_KEY;

        let imageData: string | null = null;
        let imageUrl: string | null = null;
        let provider = '';

        // Try OpenAI DALL-E first if available (highest quality)
        if (openaiApiKey) {
            try {
                imageData = await generateWithOpenAI(sanitizedPrompt, openaiApiKey);
                provider = 'DALL-E 3';
            } catch (error: any) {
                logger.warn('OpenAI image generation failed, falling back to Hugging Face:', error.message);
            }
        }

        // Try Hugging Face FLUX model (high quality, free)
        if (!imageData && hfApiKey) {
            try {
                const result = await generateWithFlux(sanitizedPrompt, hfApiKey);
                imageUrl = result.url;
                imageData = result.base64;
                provider = 'FLUX.1-dev';
            } catch (error: any) {
                logger.warn('FLUX generation failed, trying Stable Diffusion:', error.message);

                // Fallback to Stable Diffusion XL
                try {
                    imageData = await generateWithStableDiffusion(sanitizedPrompt, hfApiKey);
                    provider = 'Stable Diffusion XL';
                } catch (sdError: any) {
                    logger.error('Stable Diffusion generation failed:', sdError.message);
                }
            }
        }

        // If no API keys configured, return demo/placeholder with 200 status
        if (!imageData && !imageUrl) {
            if (!hfApiKey && !openaiApiKey) {
                // Return demo placeholder image with success status
                logger.info(`Demo mode: returning placeholder for prompt: ${sanitizedPrompt.slice(0, 50)}...`);
                res.json({
                    success: true,
                    demo: true,
                    provider: 'Demo Mode',
                    prompt: sanitizedPrompt,
                    imageUrl: `https://placehold.co/512x512/6366f1/ffffff?text=${encodeURIComponent(sanitizedPrompt.slice(0, 30))}`
                });
                return;
            }

            res.status(500).json({ error: 'Failed to generate image' });
            return;
        }

        logger.info(`Image generated successfully using ${provider} for prompt: ${sanitizedPrompt.slice(0, 50)}...`);

        res.json({
            success: true,
            imageData,
            imageUrl,
            provider,
            prompt: sanitizedPrompt
        });

    } catch (error: any) {
        logger.error('Image generation error:', error);
        res.status(500).json({ error: 'Failed to generate image' });
    }
};

// Generate image using OpenAI DALL-E 3
async function generateWithOpenAI(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            response_format: 'b64_json'
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.data[0].b64_json;
}

// Generate image using Hugging Face FLUX.1-dev model (via Together provider)
async function generateWithFlux(prompt: string, apiKey: string): Promise<{ url: string | null; base64: string | null }> {
    const response = await fetch(HUGGINGFACE_FLUX_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'black-forest-labs/FLUX.1-dev',
            prompt: prompt,
            width: 1024,
            height: 1024,
            num_inference_steps: 28,
            guidance_scale: 3.5
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FLUX API error: ${errorText}`);
    }

    const data = await response.json();

    // FLUX returns data in OpenAI-compatible format
    if (data.data && data.data[0]) {
        return {
            url: data.data[0].url || null,
            base64: data.data[0].b64_json || null
        };
    }

    throw new Error('Invalid response format from FLUX API');
}

// Generate image using Hugging Face Stable Diffusion XL (fallback)
async function generateWithStableDiffusion(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch(HUGGINGFACE_SD_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            inputs: prompt,
            parameters: {
                negative_prompt: 'blurry, bad quality, distorted, ugly',
                num_inference_steps: 30,
                guidance_scale: 7.5
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stable Diffusion API error: ${errorText}`);
    }

    // Stable Diffusion returns raw image bytes
    const imageBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    return base64;
}

// Get available providers status
export const getImageProviders = async (req: Request, res: Response): Promise<void> => {
    const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;

    const providers = {
        openai: {
            name: 'DALL-E 3',
            available: !!process.env.OPENAI_API_KEY,
            quality: 'Highest'
        },
        flux: {
            name: 'FLUX.1-dev',
            available: !!hfKey,
            quality: 'High'
        },
        stablediffusion: {
            name: 'Stable Diffusion XL',
            available: !!hfKey,
            quality: 'Good'
        }
    };

    res.json({
        providers,
        configured: providers.openai.available || providers.flux.available
    });
};
