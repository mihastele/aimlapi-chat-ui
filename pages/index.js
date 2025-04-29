// pages/index.js

import { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {
    const [config, setConfig] = useState({
        searxng_enabled: false,
        searxng_domain: "",
        deep_thinking: false,
    });
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [apiUrl, setApiUrl] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [selectedModel, setSelectedModel] = useState("gpt-3.5");
    const [models, setModels] = useState([]);

    // Load initial config and models data
    useEffect(() => {
        axios
            .get("/api/config")
            .then((res) => setConfig(res.data))
            .catch((err) => console.error("Error getting config:", err));

        refreshModels();
    }, []);

    // Function to refresh models
    const refreshModels = () => {
        axios
            .get("/api/models")
            .then((res) => setModels(res.data.models))
            .catch((err) => console.error("Error getting models:", err));
    };

    // Function to refresh the models via the refresh endpoint
    const handleRefreshModels = () => {
        axios
            .post("/api/models-refresh")
            .then((res) => setModels(res.data.models))
            .catch((err) => console.error("Error refreshing models:", err));
    };

    // Handler to send a chat message
    const handleSendMessage = () => {
        if (!chatInput.trim()) return;

        // Update chat history with the user message
        const userMessage = { sender: "User", text: chatInput };
        setChatHistory((prev) => [...prev, userMessage]);

        // Call API
        axios
            .post("/api/chat", {
                message: chatInput,
                api_url: apiUrl,
                api_key: apiKey,
                model: selectedModel,
            })
            .then((res) => {
                const botMessage = { sender: "Bot", text: res.data.response };
                setChatHistory((prev) => [...prev, botMessage]);
                setChatInput("");
            })
            .catch((err) => console.error("Error sending message:", err));
    };

    // Update backend config
    const handleConfigChange = () => {
        axios
            .post("/api/config", config)
            .then((res) => setConfig(res.data))
            .catch((err) => console.error("Error updating config:", err));
    };

    return (
        <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
            <h1>Next.js Chat Application</h1>

            {/* Configuration Section */}
            <div
                style={{
                    border: "1px solid #ccc",
                    padding: 10,
                    marginBottom: 20,
                }}
            >
                <h2>Configuration</h2>
                <div>
                    <label>
                        <input
                            type="checkbox"
                            checked={config.searxng_enabled}
                            onChange={(e) =>
                                setConfig({ ...config, searxng_enabled: e.target.checked })
                            }
                        />{" "}
                        SearxNG Enabled
                    </label>
                </div>
                <div>
                    <label>
                        SearxNG Domain:
                        <input
                            type="text"
                            value={config.searxng_domain}
                            onChange={(e) =>
                                setConfig({ ...config, searxng_domain: e.target.value })
                            }
                            placeholder="e.g. https://your.searxng.instance"
                            style={{ marginLeft: 10 }}
                        />
                    </label>
                </div>
                <div>
                    <label>
                        <input
                            type="checkbox"
                            checked={config.deep_thinking}
                            onChange={(e) =>
                                setConfig({ ...config, deep_thinking: e.target.checked })
                            }
                        />{" "}
                        Deep Thinking Enabled
                    </label>
                </div>
                <button onClick={handleConfigChange} style={{ marginTop: 10 }}>
                    Update Config
                </button>
            </div>

            {/* API Settings Section */}
            <div
                style={{
                    border: "1px solid #ccc",
                    padding: 10,
                    marginBottom: 20,
                }}
            >
                <h2>API Settings</h2>
                <div>
                    <label>
                        API URL:
                        <input
                            type="text"
                            value={apiUrl}
                            onChange={(e) => setApiUrl(e.target.value)}
                            placeholder="e.g. https://api.openai.com"
                            style={{ marginLeft: 10, width: "300px" }}
                        />
                    </label>
                </div>
                <div>
                    <label>
                        API Key:
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Your API Key"
                            style={{ marginLeft: 10, width: "300px" }}
                        />
                    </label>
                </div>
            </div>

            {/* Models Section */}
            <div
                style={{
                    border: "1px solid #ccc",
                    padding: 10,
                    marginBottom: 20,
                }}
            >
                <h2>Available Models</h2>
                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    style={{ marginRight: 10 }}
                >
                    {models.map((model, idx) => (
                        <option key={idx} value={model}>
                            {model}
                        </option>
                    ))}
                </select>
                <button onClick={refreshModels}>Refresh (GET)</button>
                <button onClick={handleRefreshModels} style={{ marginLeft: 10 }}>
                    Refresh (POST)
                </button>
            </div>

            {/* Chat Section */}
            <div style={{ border: "1px solid #ccc", padding: 10 }}>
                <h2>Chat</h2>
                <div
                    style={{
                        height: 300,
                        overflowY: "auto",
                        border: "1px solid #eee",
                        padding: 10,
                        marginBottom: 10,
                        backgroundColor: "#f9f9f9",
                    }}
                >
                    {chatHistory.map((msg, idx) => (
                        <div key={idx} style={{ marginBottom: 8 }}>
                            <strong>{msg.sender}:</strong> {msg.text}
                        </div>
                    ))}
                </div>
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your message..."
                    style={{
                        width: "70%",
                        padding: 8,
                        marginRight: 10,
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendMessage();
                    }}
                />
                <button onClick={handleSendMessage} style={{ padding: "8px 16px" }}>
                    Send
                </button>
            </div>
        </div>
    );
}