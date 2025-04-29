// pages/api/chat.js

import axios from 'axios';
import { getConfig, getApiSettings, setApiSettings } from '../../lib/db';

export default async function handler(req, res) {
    if (req.method === "POST") {
        try {
            const { message, api_url, api_key, model } = req.body;

            // Get configuration from the database
            const appConfig = getConfig();

            // Store API settings in the database if provided
            if (api_url && api_key) {
                setApiSettings(api_url, api_key);
            }

            // Get API settings from the database if not provided
            let apiUrl = api_url;
            let apiKey = api_key;

            if (!apiUrl || !apiKey) {
                const settings = getApiSettings();
                apiUrl = apiUrl || settings.api_url;
                apiKey = apiKey || settings.api_key;
            }

            // If we still don't have API settings, return an error
            if (!apiUrl || !apiKey) {
                return res.status(400).json({ 
                    error: 'API URL and API Key are required',
                    response: 'Error: API URL and API Key are required' 
                });
            }

            // Prepare the base URL
            let baseUrl = apiUrl;
            if (baseUrl.endsWith('/')) {
                baseUrl = baseUrl.slice(0, -1);
            }

            try {
                // Call the external API (OpenAI-style)
                const response = await axios.post(
                    `${baseUrl}/v1/chat/completions`,
                    {
                        model: model,
                        messages: [{ role: 'user', content: message }],
                        temperature: 0.7,
                        max_tokens: 1000
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                // Extract the response text
                let responseText = '';
                if (response.data && response.data.choices && response.data.choices.length > 0) {
                    responseText = response.data.choices[0].message.content;
                } else {
                    responseText = 'No response from API';
                }

                // Add configuration information if enabled
                if (appConfig.deep_thinking) {
                    responseText += " [Deep Thinking Enabled]";
                }
                if (appConfig.searxng_enabled) {
                    responseText += ` [SearxNG Domain: ${appConfig.searxng_domain}]`;
                }

                res.status(200).json({ response: responseText });
            } catch (error) {
                // If the API call fails, fall back to echo mode
                console.error('Error calling external API:', error);

                let responseText = `Echo (API Error): ${message} (using model '${model}')`;
                if (appConfig.deep_thinking) {
                    responseText += " [Deep Thinking Enabled]";
                }
                if (appConfig.searxng_enabled) {
                    responseText += ` [SearxNG Domain: ${appConfig.searxng_domain}]`;
                }

                res.status(200).json({ 
                    response: responseText,
                    error: `API Error: ${error.message}`
                });
            }
        } catch (error) {
            console.error('Error in chat handler:', error);
            res.status(500).json({ 
                error: `Server Error: ${error.message}`,
                response: 'Error processing your request' 
            });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}
