// pages/api/models-refresh.js

import axios from 'axios';
import { getApiSettings, saveModels } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get API settings from the database
    const { api_url, api_key } = getApiSettings();

    if (!api_url || !api_key) {
      return res.status(400).json({ 
        error: 'API URL and API Key are required',
        models: [] 
      });
    }

    // Determine the base URL and endpoint
    let baseUrl = api_url;
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Default to OpenAI-style endpoint
    const modelsEndpoint = `${baseUrl}/v1/models`;

    // Fetch models from the API
    const response = await axios.get(modelsEndpoint, {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      }
    });

    let models = [];

    // Handle the new API response format
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      models = response.data.data.map(model => ({
        name: model.id,
        provider: model.info?.developer || 'Unknown',
        type: model.type || 'Unknown'
      }));
    } 
    // Handle OpenAI-style response as fallback
    else if (response.data && response.data.data) {
      models = response.data.data.map(model => ({
        name: model.id,
        provider: 'openai',
        type: 'chat-completion'
      }));
    } 
    // Handle other API formats if needed
    else if (response.data && Array.isArray(response.data)) {
      models = response.data.map(model => ({
        name: model.id || model.name || model,
        provider: model.provider || 'Unknown',
        type: model.type || 'Unknown'
      }));
    }
    else if (response.data && response.data.models) {
      models = response.data.models.map(model => ({
        name: typeof model === 'string' ? model : (model.id || model.name),
        provider: model.provider || 'Unknown',
        type: model.type || 'Unknown'
      }));
    }

    // If no models were found, return an error
    if (models.length === 0) {
      return res.status(404).json({ 
        error: 'No models found in API response',
        models: [] 
      });
    }

    // Save models to the database
    saveModels(models);

    // Return the models
    return res.status(200).json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);

    // Return a more helpful error message
    return res.status(500).json({ 
      error: `Failed to fetch models: ${error.message}`,
      models: [] 
    });
  }
}
