// pages/api/chat-history.js

import { createChatSession, getChatSessions, saveChatMessage, getChatMessages, deleteChatSession } from '../../lib/db';

export default async function handler(req, res) {
    // GET: Retrieve chat sessions or messages for a specific session
    if (req.method === "GET") {
        try {
            // If sessionId is provided, get messages for that session
            if (req.query.sessionId) {
                const messages = getChatMessages(req.query.sessionId);
                return res.status(200).json({ messages });
            } 
            // Otherwise, get all sessions
            else {
                const sessions = getChatSessions();
                return res.status(200).json({ sessions });
            }
        } catch (error) {
            console.error('Error retrieving chat history:', error);
            return res.status(500).json({ error: 'Failed to retrieve chat history' });
        }
    } 
    // POST: Create a new session or add a message to an existing session
    else if (req.method === "POST") {
        try {
            // Create a new session
            if (req.body.action === "create_session") {
                const sessionId = createChatSession();
                return res.status(200).json({ sessionId });
            } 
            // Add a message to a session
            else if (req.body.action === "add_message") {
                const { sessionId, sender, message } = req.body;
                if (!sessionId || !sender || !message) {
                    return res.status(400).json({ error: 'sessionId, sender, and message are required' });
                }
                saveChatMessage(sessionId, sender, message);
                return res.status(200).json({ success: true });
            }
            else {
                return res.status(400).json({ error: 'Invalid action' });
            }
        } catch (error) {
            console.error('Error managing chat history:', error);
            return res.status(500).json({ error: 'Failed to manage chat history' });
        }
    } 
    // DELETE: Delete a chat session
    else if (req.method === "DELETE") {
        try {
            const { sessionId } = req.body;
            if (!sessionId) {
                return res.status(400).json({ error: 'sessionId is required' });
            }
            deleteChatSession(sessionId);
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error deleting chat session:', error);
            return res.status(500).json({ error: 'Failed to delete chat session' });
        }
    } 
    else {
        res.status(405).json({ error: "Method not allowed" });
    }
}