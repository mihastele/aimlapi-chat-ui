# Next.js Chat Application

This is a [Next.js](https://nextjs.org) chat application that connects to AI APIs like OpenAI.

## Features

- Connect to AI APIs (like OpenAI) for chat functionality
- Fetch and use models directly from the API
- Store configuration and API settings in a SQLite database
- Secure storage of API keys using encryption
- SearxNG integration for enhanced search capabilities
- Deep thinking mode for more thoughtful responses

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Configuration

### API Settings

1. Enter your API URL (e.g., https://api.openai.com)
2. Enter your API Key
3. Click "Save API Settings" to store them securely in the database

### Models

The application will fetch available models from the API. You can:
- Select a model from the dropdown
- Click "Refresh (GET)" to load models from the database
- Click "Refresh (POST)" to fetch fresh models from the API

### Chat

Enter your message and click "Send" to chat with the AI. The application will:
1. Use your selected model
2. Connect to the API using your stored credentials
3. Display the AI's response

## Technical Details

### Database

The application uses SQLite to store:
- Configuration settings
- API credentials (encrypted)
- Available models

### Security

API keys are encrypted using AES encryption before being stored in the database.

### API Integration

The application is designed to work with OpenAI-compatible APIs, using endpoints like:
- `/v1/models` to fetch available models
- `/v1/chat/completions` for chat functionality

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
