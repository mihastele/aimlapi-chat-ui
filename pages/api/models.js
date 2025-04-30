// pages/api/models.js

import { getModels } from '../../lib/db';

export default function handler(req, res) {
    if (req.method === "GET") {
        // Fetch models from the database
        const models = getModels();

        // If no models in database, return default models
        if (models.length === 0) {
            const defaultModels = ["gpt-3.5", "gpt-4", "custom-model"];
            res.status(200).json({ models: defaultModels });
        } else {
            res.status(200).json({ models });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}
