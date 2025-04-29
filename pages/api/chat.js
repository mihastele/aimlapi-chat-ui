// pages/api/chat.js

// Import the current configuration by requiring the config file.
// Since Next.js API routes are isolated, we mimic shared state by defining the config here.
// In production, you might use a proper state management solution.
let appConfig = {
    searxng_enabled: false,
    searxng_domain: "",
    deep_thinking: false
};

// To simulate shared state between endpoints, we export a function to update or get the config.
// (For simplicity, the config update in config.js won’t affect this copy unless you wire it together.)
export function setAppConfig(newConfig) {
    appConfig = { ...newConfig };
}

export default function handler(req, res) {
    if (req.method === "POST") {
        const { message, api_url, api_key, model } = req.body;
        let responseText = `Echo: ${message} (using model '${model}')`;
        if (appConfig.deep_thinking) {
            responseText += " [Deep Thinking Enabled]";
        }
        if (appConfig.searxng_enabled) {
            responseText += ` [SearxNG Domain: ${appConfig.searxng_domain}]`;
        }
        res.status(200).json({ response: responseText });
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}