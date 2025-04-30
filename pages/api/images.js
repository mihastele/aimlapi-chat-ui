// pages/api/images.js

import { getGeneratedImages } from '../../lib/db';

export default async function handler(req, res) {
    if (req.method === "GET") {
        try {
            // Get limit from query parameter or use default
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            
            // Get generated images from the database
            const images = getGeneratedImages(limit);
            
            res.status(200).json({ images });
        } catch (error) {
            console.error('Error retrieving images:', error);
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}