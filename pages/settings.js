// pages/settings.js

import { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button, Card, Alert, InputGroup, Dropdown } from 'react-bootstrap';
import axios from "axios";
import { useRouter } from 'next/router';

export default function Settings() {
    const router = useRouter();
    const [config, setConfig] = useState({
        searxng_enabled: false, 
        searxng_domain: "", 
        searxng_engine: "google", 
        deep_thinking: false,
    });
    const [apiUrl, setApiUrl] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [selectedModel, setSelectedModel] = useState("gpt-3.5");
    const [models, setModels] = useState([]);
    const [searchEngines] = useState(["google", "bing", "duckduckgo", "yahoo", "brave"]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [modelSearchTerm, setModelSearchTerm] = useState("");
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [totalTokens, setTotalTokens] = useState(0);

    // Filter models based on search term
    const filteredModels = models.filter(model => 
        model.toLowerCase().includes(modelSearchTerm.toLowerCase())
    );

    // Load initial config, API settings, and models data
    useEffect(() => {
        // Check localStorage first for the selected model
        const savedModel = localStorage.getItem('selectedModel');
        if (savedModel) {
            setSelectedModel(savedModel);
        }

        // Load config
        axios
            .get("/api/config")
            .then((res) => {
                setConfig(res.data);
                // Set the selected model from config if available
                if (res.data.selected_model) {
                    setSelectedModel(res.data.selected_model);
                    // Update localStorage with the model from config
                    localStorage.setItem('selectedModel', res.data.selected_model);
                }
            })
            .catch((err) => {
                console.error("Error getting config:", err);
                setError("Error loading configuration settings");
            });

        // Load API settings
        axios
            .get("/api/api-settings")
            .then((res) => {
                setApiUrl(res.data.api_url || "");
                // Don't set the API key if it's masked
                if (res.data.api_key && res.data.api_key !== "********") {
                    setApiKey(res.data.api_key);
                }
            })
            .catch((err) => {
                console.error("Error getting API settings:", err);
                setError("Error loading API settings");
            });

        refreshModels();

        // Load token usage
        axios
            .get("/api/token-usage")
            .then((res) => {
                setTotalTokens(res.data.total_tokens);
            })
            .catch((err) => {
                console.error("Error getting token usage:", err);
            });
    }, []);

    // Function to refresh models
    const refreshModels = () => {
        axios
            .get("/api/models")
            .then((res) => setModels(res.data.models))
            .catch((err) => {
                console.error("Error getting models:", err);
                setError("Error loading available models");
            });
    };

    // Function to refresh the models via the refresh endpoint
    const handleRefreshModels = () => {
        axios
            .post("/api/models-refresh")
            .then((res) => {
                setModels(res.data.models);
                setSuccess("Models refreshed successfully");
                setTimeout(() => setSuccess(null), 3000);
            })
            .catch((err) => {
                console.error("Error refreshing models:", err);
                setError("Error refreshing models");
            });
    };

    // Update backend config
    const handleConfigChange = (newConfig = config) => {
        axios
            .post("/api/config", newConfig)
            .then((res) => {
                setConfig(res.data);
                setSuccess("Configuration updated successfully");
                setTimeout(() => setSuccess(null), 3000);
            })
            .catch((err) => {
                console.error("Error updating config:", err);
                setError("Error updating configuration");
            });
    };

    // Save API settings
    const handleSaveApiSettings = () => {
        axios.post("/api/api-settings", {
            api_url: apiUrl,
            api_key: apiKey
        })
            .then(res => {
                setSuccess("API settings saved successfully");
                setTimeout(() => setSuccess(null), 3000);
            })
            .catch(err => {
                console.error("Error saving API settings:", err);
                setError("Error saving API settings: " + (err.response?.data?.error || err.message));
            });
    };

    return (
        <Container className="py-4">
            <Row className="mb-4">
                <Col>
                    <h1 className="text-primary">Settings</h1>
                    <Button 
                        variant="outline-primary" 
                        onClick={() => router.push('/')}
                        className="mb-3 me-2"
                    >
                        Back to Chat
                    </Button>
                    <Button 
                        variant="outline-primary" 
                        onClick={() => router.push('/model-generator')}
                        className="mb-3"
                    >
                        3D Model Generator
                    </Button>
                </Col>
            </Row>

            {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
                    {success}
                </Alert>
            )}

            {/* Configuration Section */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-primary text-white">
                    <h2 className="h5 mb-0">Configuration</h2>
                </Card.Header>
                <Card.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                id="searxng-enabled"
                                label="SearxNG Enabled"
                                checked={config.searxng_enabled}
                                onChange={(e) => setConfig({...config, searxng_enabled: e.target.checked})}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>SearxNG Domain</Form.Label>
                            <Form.Control
                                type="text"
                                value={config.searxng_domain}
                                onChange={(e) => setConfig({...config, searxng_domain: e.target.value})}
                                placeholder="e.g. https://your.searxng.instance"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Search Engine</Form.Label>
                            <Form.Select
                                value={config.searxng_engine}
                                onChange={(e) => setConfig({...config, searxng_engine: e.target.value})}
                            >
                                {searchEngines.map((engine, idx) => (
                                    <option key={idx} value={engine}>
                                        {engine.charAt(0).toUpperCase() + engine.slice(1)}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                id="deep-thinking"
                                label="Deep Thinking Enabled"
                                checked={config.deep_thinking}
                                onChange={(e) => setConfig({...config, deep_thinking: e.target.checked})}
                            />
                        </Form.Group>

                        <Button variant="primary" onClick={() => handleConfigChange()}>
                            Update Config
                        </Button>
                    </Form>
                </Card.Body>
            </Card>

            {/* API Settings Section */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-primary text-white">
                    <h2 className="h5 mb-0">API Settings</h2>
                </Card.Header>
                <Card.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>API URL</Form.Label>
                            <Form.Control
                                type="text"
                                value={apiUrl}
                                onChange={(e) => setApiUrl(e.target.value)}
                                placeholder="e.g. https://api.openai.com"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>API Key</Form.Label>
                            <Form.Control
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Your API Key"
                            />
                        </Form.Group>

                        <Button
                            variant="primary"
                            onClick={handleSaveApiSettings}
                        >
                            Save API Settings
                        </Button>
                    </Form>
                </Card.Body>
            </Card>

            {/* Models Section */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-primary text-white">
                    <h2 className="h5 mb-0">Available Models</h2>
                </Card.Header>
                <Card.Body>
                    <div className="mb-3">
                        <div className="d-flex mb-2">
                            <Dropdown 
                                className="flex-grow-1 me-2"
                                show={showModelDropdown}
                                onToggle={(isOpen) => setShowModelDropdown(isOpen)}
                            >
                                <Dropdown.Toggle variant="outline-primary" style={{ width: '100%', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {selectedModel}
                                </Dropdown.Toggle>
                                <Dropdown.Menu style={{ width: '100%', maxHeight: '300px', overflow: 'auto' }}>
                                    <div className="px-2 py-1">
                                        <Form.Control
                                            size="sm"
                                            type="text"
                                            placeholder="Search models..."
                                            value={modelSearchTerm}
                                            onChange={(e) => setModelSearchTerm(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                    </div>
                                    <Dropdown.Divider />
                                    {filteredModels.length > 0 ? (
                                        filteredModels.map((model, idx) => (
                                            <Dropdown.Item 
                                                key={idx} 
                                                onClick={() => {
                                                    setSelectedModel(model);
                                                    // Save selected model to localStorage
                                                    localStorage.setItem('selectedModel', model);
                                                    setShowModelDropdown(false);
                                                    setModelSearchTerm("");
                                                }}
                                                active={model === selectedModel}
                                            >
                                                {model}
                                            </Dropdown.Item>
                                        ))
                                    ) : (
                                        <Dropdown.Item disabled>No models found</Dropdown.Item>
                                    )}
                                </Dropdown.Menu>
                            </Dropdown>
                            <Button variant="outline-secondary" onClick={handleRefreshModels}>
                                Refresh
                            </Button>
                        </div>
                        <Button 
                            variant="primary" 
                            onClick={() => {
                                // Save selected model to config and localStorage
                                const updatedConfig = {...config, selected_model: selectedModel};
                                handleConfigChange(updatedConfig);
                                localStorage.setItem('selectedModel', selectedModel);
                                setSuccess(`Model "${selectedModel}" set as default`);
                                setTimeout(() => setSuccess(null), 3000);
                            }}
                        >
                            Set as Default Model
                        </Button>
                    </div>
                </Card.Body>
            </Card>

            {/* Token Usage Section */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-primary text-white">
                    <h2 className="h5 mb-0">Token Usage</h2>
                </Card.Header>
                <Card.Body>
                    <div className="mb-3">
                        <h3 className="h6">Total Tokens Used</h3>
                        <p className="display-4 text-center">{totalTokens.toLocaleString()}</p>
                        <p className="text-muted text-center">
                            This is the total number of tokens used across all conversations.
                        </p>
                        <Button 
                            variant="outline-primary" 
                            onClick={() => {
                                axios
                                    .get("/api/token-usage")
                                    .then((res) => {
                                        setTotalTokens(res.data.total_tokens);
                                        setSuccess("Token usage refreshed");
                                        setTimeout(() => setSuccess(null), 3000);
                                    })
                                    .catch((err) => {
                                        console.error("Error getting token usage:", err);
                                        setError("Error refreshing token usage");
                                    });
                            }}
                        >
                            Refresh Token Usage
                        </Button>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
}
