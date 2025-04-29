// pages/api/chat.js

import axios from 'axios';
import { getConfig, getApiSettings, setApiSettings, saveChatMessage } from '../../lib/db';

// Function to perform a search using SearxNG
async function performSearch(query, domain, engine = 'google') {
    try {
        const searchUrl = `${domain}/search`;
        const params = {
            q: query,
            format: 'json',
            engines: engine
        };

        const response = await axios.get(searchUrl, { params });
        return response.data;
    } catch (error) {
        console.error('Error performing SearxNG search:', error);
        return { error: `Search error: ${error.message}` };
    }
}

export default async function handler(req, res) {
    if (req.method === "POST") {
        try {
            const { message, api_url, api_key, model, sessionId } = req.body;

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

            // Save user message to chat history if sessionId is provided
            if (sessionId) {
                saveChatMessage(sessionId, 'User', message);
            }

            // Perform search if SearxNG is enabled
            let searchResults = null;
            let enhancedMessage = message;

            if (appConfig.searxng_enabled && appConfig.searxng_domain) {
                try {
                    searchResults = await performSearch(message, appConfig.searxng_domain, appConfig.searxng_engine);

                    // Combine search results with the message
                    if (searchResults && searchResults.results && searchResults.results.length > 0) {
                        const topResults = searchResults.results.slice(0, 3); // Get top 3 results
                        const searchInfo = topResults.map(result => 
                            `Title: ${result.title}\nURL: ${result.url}\nContent: ${result.content || 'No content available'}`
                        ).join('\n\n');

                        enhancedMessage = `I want to answer the following question: "${message}"\n\nHere is some relevant information from a web search:\n${searchInfo}\n\nPlease use this information to provide a comprehensive answer.`;
                    }
                } catch (error) {
                    console.error('Error with SearxNG search:', error);
                }
            }

            try {
                // Prepare messages array based on deep thinking setting
                let messages = [];

                if (appConfig.deep_thinking) {
                    // For deep thinking, use a system message to encourage more thorough analysis
                    messages = [
                        { 
                            role: 'system', 
                            content: 'You are a thoughtful assistant that carefully analyzes questions before answering. Take your time to think step by step and consider different perspectives before providing a comprehensive response.' 
                        },
                        { role: 'user', content: enhancedMessage }
                    ];
                } else {
                    // Standard message format
                    messages = [{ role: 'user', content: enhancedMessage }];
                }

                // Call the external API (OpenAI-style)
                const response = await axios.post(
                    `${baseUrl}/v1/chat/completions`,
                    {
                        model: model,
                        messages: messages,
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

                // Save bot response to chat history if sessionId is provided
                if (sessionId) {
                    saveChatMessage(sessionId, 'Bot', responseText);
                }

                res.status(200).json({ response: responseText });
            } catch (error) {
                // If the API call fails, fall back to echo mode
                console.error('Error calling external API:', error);

                let responseText = `Echo (API Error): ${message} (using model '${model}')`;

                // Save error response to chat history if sessionId is provided
                if (sessionId) {
                    saveChatMessage(sessionId, 'Bot', responseText);
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
