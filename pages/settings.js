// pages/settings.js

import { useState, useEffect } from "react";
import { Container, Row, Col, Form, Button, Card, Alert, InputGroup } from 'react-bootstrap';
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

    // Load initial config, API settings, and models data
    useEffect(() => {
        // Load config
        axios
            .get("/api/config")
            .then((res) => setConfig(res.data))
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
                    <InputGroup className="mb-3">
                        <Form.Select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                        >
                            {models.map((model, idx) => (
                                <option key={idx} value={model}>
                                    {model}
                                </option>
                            ))}
                        </Form.Select>
                        <Button variant="outline-secondary" onClick={handleRefreshModels}>
                            Refresh
                        </Button>
                    </InputGroup>
                </Card.Body>
            </Card>
        </Container>
    );
}