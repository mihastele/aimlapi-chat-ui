// lib/db.js

const Database = require('better-sqlite3');
const CryptoJS = require('crypto-js');
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dataDir, 'chat_app.db');

// Encryption key - in production, this should be stored in environment variables
// For this example, we'll use a fixed key, but in a real app, use process.env.ENCRYPTION_KEY
const ENCRYPTION_KEY = 'your-secret-encryption-key';

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
    deep_thinking: false
  };
  
  rows.forEach(row => {
    if (row.key === 'searxng_enabled') {
      config.searxng_enabled = row.value === 'true';
    } else if (row.key === 'searxng_domain') {
      config.searxng_domain = row.value;
    } else if (row.key === 'deep_thinking') {
      config.deep_thinking = row.value === 'true';
    }
  });
  
  return config;
}

function setConfig(config) {
  const insertOrUpdate = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
  
  const transaction = db.transaction((config) => {
    insertOrUpdate.run('searxng_enabled', config.searxng_enabled.toString());
    insertOrUpdate.run('searxng_domain', config.searxng_domain);
    insertOrUpdate.run('deep_thinking', config.deep_thinking.toString());
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
  const stmt = db.prepare('SELECT name FROM models ORDER BY id');
  const rows = stmt.all();
  return rows.map(row => row.name);
}

function saveModels(models, provider = 'openai') {
  const deleteStmt = db.prepare('DELETE FROM models');
  const insertStmt = db.prepare('INSERT INTO models (name, provider) VALUES (?, ?)');
  
  const transaction = db.transaction((models) => {
    deleteStmt.run();
    models.forEach(model => {
      insertStmt.run(model, provider);
    });
  });
  
  transaction(models);
  return getModels();
}

module.exports = {
  getConfig,
  setConfig,
  getApiSettings,
  setApiSettings,
  getModels,
  saveModels
};