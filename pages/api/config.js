// pages/api/config.js

import { getConfig, setConfig } from '../../lib/db';

export default function handler(req, res) {
    if (req.method === "GET") {
        // Get configuration from the database
        const config = getConfig();
        res.status(200).json(config);
    } else if (req.method === "POST") {
        // Update configuration in the database
        const updatedConfig = setConfig(req.body);
        res.status(200).json(updatedConfig);
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}
