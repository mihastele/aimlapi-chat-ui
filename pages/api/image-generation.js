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
            let payload;

            // Use specific schema for flux-pro model
            if (model === "flux-pro") {
                payload = {
                    model: "flux-pro",
                    image_size: {
                        width: parseInt(image_size.width),
                        height: parseInt(image_size.height)
                    },
                    num_inference_steps: parseInt(num_inference_steps),
                    guidance_scale: parseFloat(guidance_scale),
                    safety_tolerance: safety_tolerance,
                    output_format: output_format,
                    prompt: prompt,
                    num_images: parseInt(num_images)
                };

                // Add seed if provided
                if (seed) {
                    payload.seed = parseInt(seed);
                }
            } else {
                // Use standard payload for other models
                payload = {
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
            }

            // Call the external API
            const response = await axios.post(
                "https://api.aimlapi.com/v1/images/generations",
                payload,
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "Accept": "*/*"
                    }
                }
            );

            // Extract all image URLs from the response
            const images = response.data.images;
            const actualSeed = response.data.seed;

            // Save all generated images to the database
            const savedImages = [];
            for (const image of images) {
                const imageUrl = image.url;
                const width = image.width;
                const height = image.height;

                // Save each image to the database
                saveGeneratedImage(prompt, imageUrl, model, width, height);

                savedImages.push({
                    image_url: imageUrl,
                    width,
                    height
                });
            }

            // Return all image URLs and other details
            res.status(200).json({
                images: savedImages,
                image_url: savedImages[0].image_url, // For backward compatibility
                width: savedImages[0].width,
                height: savedImages[0].height,
                seed: actualSeed,
                has_nsfw_concepts: response.data.has_nsfw_concepts || false
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
