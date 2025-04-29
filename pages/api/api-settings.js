// pages/api/api-settings.js

import { getApiSettings, setApiSettings } from '../../lib/db';

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Get API settings from the database
    const settings = getApiSettings();
    res.status(200).json(settings);
  } else if (req.method === 'POST') {
    try {
      const { api_url, api_key } = req.body;
      
      // Validate input
      if (!api_url || !api_key) {
        return res.status(400).json({ 
          error: 'API URL and API Key are required' 
        });
      }
      
      // Store API settings in the database
      const settings = setApiSettings(api_url, api_key);
      
      // Return the settings (without the actual API key for security)
      res.status(200).json({ 
        api_url: settings.api_url,
        api_key: '********' // Mask the API key in the response
      });
    } catch (error) {
      console.error('Error saving API settings:', error);
      res.status(500).json({ 
        error: `Failed to save API settings: ${error.message}` 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}