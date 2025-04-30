// lib/db.js

import Database from "better-sqlite3";
import CryptoJS from "crypto-js";
import path from "path";
import fs from "fs";
// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dataDir, 'chat_app.db');

// Encryption key - in production, this should be stored in environment variables
// For this example, we'll use a fixed key, but in a real app, use process.env.ENCRYPTION_KEY
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Initialize database
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS api_settings (
    id INTEGER PRIMARY KEY,
    api_url TEXT,
    api_key TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
  );

  CREATE TABLE IF NOT EXISTS token_usage (
    id INTEGER PRIMARY KEY,
    total_tokens INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS generated_images (
    id INTEGER PRIMARY KEY,
    prompt TEXT NOT NULL,
    image_url TEXT NOT NULL,
    model TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Encrypt data
function encrypt(text) {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

// Decrypt data
function decrypt(ciphertext) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Config functions
function getConfig() {
  const stmt = db.prepare('SELECT key, value FROM config');
  const rows = stmt.all();

  const config = {
    searxng_enabled: false,
    searxng_domain: '',
    searxng_engine: 'google',
    deep_thinking: false,
    selected_model: 'gpt-3.5'
  };

  rows.forEach(row => {
    if (row.key === 'searxng_enabled') {
      config.searxng_enabled = row.value === 'true';
    } else if (row.key === 'searxng_domain') {
      config.searxng_domain = row.value;
    } else if (row.key === 'searxng_engine') {
      config.searxng_engine = row.value;
    } else if (row.key === 'deep_thinking') {
      config.deep_thinking = row.value === 'true';
    } else if (row.key === 'selected_model') {
      config.selected_model = row.value;
    }
  });

  return config;
}

function setConfig(config) {
  const insertOrUpdate = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');

  const transaction = db.transaction((config) => {
    insertOrUpdate.run('searxng_enabled', config.searxng_enabled.toString());
    insertOrUpdate.run('searxng_domain', config.searxng_domain);
    insertOrUpdate.run('searxng_engine', config.searxng_engine || 'google');
    insertOrUpdate.run('deep_thinking', config.deep_thinking.toString());
    insertOrUpdate.run('selected_model', config.selected_model || 'gpt-3.5');
  });

  transaction(config);
  return getConfig();
}

// API settings functions
function getApiSettings() {
  const stmt = db.prepare('SELECT * FROM api_settings ORDER BY id DESC LIMIT 1');
  const settings = stmt.get();

  if (!settings) {
    return { api_url: '', api_key: '' };
  }

  return {
    api_url: settings.api_url,
    api_key: settings.api_key ? decrypt(settings.api_key) : ''
  };
}

function setApiSettings(apiUrl, apiKey) {
  const encryptedKey = encrypt(apiKey);

  const stmt = db.prepare(`
    INSERT INTO api_settings (api_url, api_key, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);

  stmt.run(apiUrl, encryptedKey);
  return getApiSettings();
}

// Models functions
function getModels() {
  const stmt = db.prepare('SELECT name, provider, type FROM models ORDER BY id');
  const rows = stmt.all();
  return rows;
}

function saveModels(models) {
  const deleteStmt = db.prepare('DELETE FROM models');
  const insertStmt = db.prepare('INSERT INTO models (name, provider, type) VALUES (?, ?, ?)');

  const transaction = db.transaction((models) => {
    deleteStmt.run();
    models.forEach(model => {
      insertStmt.run(model.name, model.provider, model.type);
    });
  });

  transaction(models);
  return getModels();
}

// Chat functions
function createChatSession() {
  const stmt = db.prepare('INSERT INTO chat_sessions DEFAULT VALUES');
  const result = stmt.run();
  return result.lastInsertRowid;
}

function getChatSessions() {
  const stmt = db.prepare('SELECT * FROM chat_sessions ORDER BY created_at DESC');
  return stmt.all();
}

function saveChatMessage(sessionId, sender, message, tokens = 0) {
  const stmt = db.prepare(`
    INSERT INTO chat_messages (session_id, sender, message, tokens_used)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(sessionId, sender, message, tokens);

  // If tokens were used, update the total token usage
  if (tokens > 0) {
    updateTotalTokenUsage(tokens);
  }
}

function getChatMessages(sessionId) {
  const stmt = db.prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp');
  return stmt.all(sessionId);
}

function deleteChatSession(sessionId) {
  const deleteMessages = db.prepare('DELETE FROM chat_messages WHERE session_id = ?');
  const deleteSession = db.prepare('DELETE FROM chat_sessions WHERE id = ?');

  const transaction = db.transaction((sessionId) => {
    deleteMessages.run(sessionId);
    deleteSession.run(sessionId);
  });

  transaction(sessionId);
}

// Token usage functions
function getTotalTokenUsage() {
  const stmt = db.prepare('SELECT total_tokens FROM token_usage ORDER BY id DESC LIMIT 1');
  const result = stmt.get();

  return result ? result.total_tokens : 0;
}

function updateTotalTokenUsage(tokens) {
  // Check if we have an existing record
  const existingStmt = db.prepare('SELECT id, total_tokens FROM token_usage ORDER BY id DESC LIMIT 1');
  const existing = existingStmt.get();

  if (existing) {
    // Update existing record
    const updateStmt = db.prepare('UPDATE token_usage SET total_tokens = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    updateStmt.run(existing.total_tokens + tokens, existing.id);
  } else {
    // Create new record
    const insertStmt = db.prepare('INSERT INTO token_usage (total_tokens) VALUES (?)');
    insertStmt.run(tokens);
  }

  return getTotalTokenUsage();
}

// Image generation functions
function saveGeneratedImage(prompt, imageUrl, model, width, height) {
  const stmt = db.prepare(`
    INSERT INTO generated_images (prompt, image_url, model, width, height)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(prompt, imageUrl, model, width, height);
  return result.lastInsertRowid;
}

function getGeneratedImages(limit = 10) {
  const stmt = db.prepare('SELECT * FROM generated_images ORDER BY created_at DESC LIMIT ?');
  return stmt.all(limit);
}

export {
  getConfig,
  setConfig,
  getApiSettings,
  setApiSettings,
  getModels,
  saveModels,
  createChatSession,
  getChatSessions,
  saveChatMessage,
  getChatMessages,
  deleteChatSession,
  getTotalTokenUsage,
  updateTotalTokenUsage,
  saveGeneratedImage,
  getGeneratedImages
};
