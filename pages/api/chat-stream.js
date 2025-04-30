// pages/api/chat-stream.js

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
    // Set headers for streaming for POST requests
    if (req.method === "POST") {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
    }

    // Handle POST requests for actual data processing
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
                res.write(`data: ${JSON.stringify({ 
                    error: 'API URL and API Key are required',
                    done: true
                })}\n\n`);
                return res.end();
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
                    // Send a message that we're searching
                    res.write(`data: ${JSON.stringify({ 
                        chunk: "Searching for information...", 
                        done: false 
                    })}\n\n`);

                    searchResults = await performSearch(message, appConfig.searxng_domain, appConfig.searxng_engine);

                    // Combine search results with the message
                    if (searchResults && searchResults.results && searchResults.results.length > 0) {
                        const topResults = searchResults.results.slice(0, 3); // Get top 3 results
                        const searchInfo = topResults.map(result =>
                            `Title: ${result.title}\nURL: ${result.url}\nContent: ${result.content || 'No content available'}`
                        ).join('\n\n');

                        enhancedMessage = `I want to answer the following question: "${message}"\n\nHere is some relevant information from a web search:\n${searchInfo}\n\nPlease use this information to provide a comprehensive answer.`;

                        // Send a message that search is complete
                        res.write(`data: ${JSON.stringify({ 
                            chunk: "Search complete. Generating response...", 
                            done: false 
                        })}\n\n`);
                    }
                } catch (error) {
                    console.error('Error with SearxNG search:', error);
                    res.write(`data: ${JSON.stringify({ 
                        chunk: "Error performing search. Continuing with standard response...", 
                        done: false 
                    })}\n\n`);
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

                // Call the external API with streaming enabled
                const response = await axios.post(
                    `${baseUrl}/v1/chat/completions`,
                    {
                        model: model,
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 1000,
                        stream: true  // Enable streaming
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        responseType: 'stream'
                    }
                );

                let fullResponse = '';

                // Buffer to accumulate incomplete chunks
                let buffer = '';

                // Process the streaming response
                response.data.on('data', (chunk) => {
                    // Parse the chunk data (format depends on the API)
                    const chunkText = chunk.toString();

                    // Add the new chunk to our buffer
                    buffer += chunkText;

                    // Process complete messages (each message ends with '\n\n')
                    // We need to be careful with the splitting to ensure we don't break JSON objects
                    const lines = buffer.split('\n\n');

                    // Keep the last line in the buffer as it might be incomplete
                    buffer = lines.pop() || '';

                    // Process each complete line
                    for (const line of lines) {
                        // Only process data lines and not [DONE] markers
                        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                            try {
                                // Extract the JSON part
                                const jsonStr = line.substring(6);

                                // Skip empty strings
                                if (!jsonStr.trim()) continue;

                                // Try to parse the JSON
                                try {
                                    const data = JSON.parse(jsonStr);

                                    // Extract content if available
                                    if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                                        const content = data.choices[0].delta.content;
                                        fullResponse += content;

                                        // Send the chunk to the client
                                        res.write(`data: ${JSON.stringify({ 
                                            chunk: content, 
                                            done: false 
                                        })}\n\n`);
                                    }
                                } catch (parseError) {
                                    // If we can't parse this chunk, add it back to the buffer
                                    // It might be an incomplete JSON that will be completed in the next chunk
                                    buffer = line + '\n\n' + buffer;
                                    console.log('Incomplete JSON detected, waiting for more data');
                                }
                            } catch (e) {
                                console.error('Error processing chunk:', e);
                                // Continue processing other messages even if one fails
                            }
                        }
                    }
                });

                response.data.on('end', () => {
                    // Save the complete response to chat history
                    if (sessionId && fullResponse) {
                        saveChatMessage(sessionId, 'Bot', fullResponse);
                    }

                    // Send the final message
                    res.write(`data: ${JSON.stringify({ 
                        done: true 
                    })}\n\n`);
                    res.end();
                });

                response.data.on('error', (err) => {
                    console.error('Stream error:', err);
                    res.write(`data: ${JSON.stringify({ 
                        error: `Stream error: ${err.message}`,
                        done: true
                    })}\n\n`);
                    res.end();
                });

            } catch (error) {
                // If the API call fails, fall back to echo mode
                console.error('Error calling external API:', error);

                let responseText = `Echo (API Error): ${message} (using model '${model}')`;

                // Save error response to chat history if sessionId is provided
                if (sessionId) {
                    saveChatMessage(sessionId, 'Bot', responseText);
                }

                res.write(`data: ${JSON.stringify({ 
                    chunk: responseText,
                    error: `API Error: ${error.message}`,
                    done: true
                })}\n\n`);
                res.end();
            }
        } catch (error) {
            console.error('Error in chat handler:', error);
            res.write(`data: ${JSON.stringify({ 
                error: `Server Error: ${error.message}`,
                done: true
            })}\n\n`);
            res.end();
        }
    } else {
        res.status(405).json({ error: "Method not allowed. Only POST requests are supported." });
    }
}
