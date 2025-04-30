// pages/api/token-usage.js

import { getTotalTokenUsage } from '../../lib/db';

export default async function handler(req, res) {
    if (req.method === "GET") {
        try {
            // Get total token usage from the database
            const totalTokens = getTotalTokenUsage();
            
            res.status(200).json({ total_tokens: totalTokens });
        } catch (error) {
            console.error('Error retrieving token usage:', error);
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}