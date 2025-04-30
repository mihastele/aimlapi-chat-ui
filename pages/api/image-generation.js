// pages/api/image-generation.js

import axios from 'axios';
import { getApiSettings, saveGeneratedImage } from '../../lib/db';

export default async function handler(req, res) {
    if (req.method === "POST") {
        try {
            const { 
                prompt, 
                model = "flux-pro", 
                image_size = { width: 1024, height: 1024 },
                num_inference_steps = 30,
                guidance_scale = 7.5,
                safety_tolerance = "medium",
                output_format = "jpeg",
                num_images = 1,
                seed
            } = req.body;

            // Get API settings from the database
            const settings = getApiSettings();
            const apiKey = settings.api_key;

            if (!apiKey) {
                return res.status(400).json({ error: 'API Key is required' });
            }

            // Prepare the request payload
            const payload = {
                prompt,
                model,
                image_size,
                num_inference_steps,
                guidance_scale,
                safety_tolerance,
                output_format,
                num_images
            };

            // Add seed if provided
            if (seed) {
                payload.seed = seed;
            }

            // Call the external API
            const response = await axios.post(
                "https://api.aimlapi.com/v1/images/generations",
                payload,
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    }
                }
            );

            // Extract the image URL from the response
            const imageUrl = response.data.images[0].url;
            const width = response.data.images[0].width;
            const height = response.data.images[0].height;
            const actualSeed = response.data.seed;

            // Save the generated image to the database
            saveGeneratedImage(prompt, imageUrl, model, width, height);

            // Return the image URL and other details
            res.status(200).json({
                image_url: imageUrl,
                width,
                height,
                seed: actualSeed,
                has_nsfw_concepts: response.data.has_nsfw_concepts?.[0] || false
            });

        } catch (error) {
            console.error('Error generating image:', error);
            
            // Handle API error response
            if (error.response) {
                return res.status(error.response.status).json({
                    error: error.response.data.error || 'Error from image generation API'
                });
            }
            
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}