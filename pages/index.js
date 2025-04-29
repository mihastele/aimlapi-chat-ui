// pages/index.js

import {useState, useEffect} from "react";
import axios from "axios";
import {Container, Row, Col, Form, Button, Card, ListGroup, InputGroup} from 'react-bootstrap';

export default function Home() {
    const [config, setConfig] = useState({
        searxng_enabled: false, searxng_domain: "", deep_thinking: false,
    });
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [apiUrl, setApiUrl] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [selectedModel, setSelectedModel] = useState("gpt-3.5");
    const [models, setModels] = useState([]);

    // Load initial config, API settings, and models data
    useEffect(() => {
        // Load config
        axios
            .get("/api/config")
            .then((res) => setConfig(res.data))
            .catch((err) => console.error("Error getting config:", err));

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
            .catch((err) => console.error("Error getting API settings:", err));

        // refreshModels();
    }, []);

    // // Function to refresh models
    // const refreshModels = () => {
    //     axios
    //         .get("/api/models")
    //         .then((res) => setModels(res.data.models))
    //         .catch((err) => console.error("Error getting models:", err));
    // };

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
        const userMessage = {sender: "User", text: chatInput};
        setChatHistory((prev) => [...prev, userMessage]);

        // Call API
        axios
            .post("/api/chat", {
                message: chatInput, api_url: apiUrl, api_key: apiKey, model: selectedModel,
            })
            .then((res) => {
                const botMessage = {sender: "Bot", text: res.data.response};
                setChatHistory((prev) => [...prev, botMessage]);
                setChatInput("");
            })
            .catch((err) => console.error("Error sending message:", err));
    };

    // Update backend config
    // const handleConfigChange = () => {
    //     axios
    //         .post("/api/config", config)
    //         .then((res) => setConfig(res.data))
    //         .catch((err) => console.error("Error updating config:", err));
    // };
    const handleConfigChange = (newConfig = config) => {
        axios
            .post("/api/config", newConfig)
            .then((res) => setConfig(res.data))
            .catch((err) => console.error("Error updating config:", err));
    };

    return (<Container className="py-4">
        <Row className="mb-4">
            <Col>
                <h1 className="text-primary">AIMLAPI Chat UI</h1>
            </Col>
        </Row>

        {/* Configuration Section */}
        <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-primary text-white">
                <h2 className="h5 mb-0">Configuration</h2>
            </Card.Header>
            <Card.Body>
                <Form>


                    <Form.Group className="mb-3">
                        <Form.Label>SearxNG Domain</Form.Label>
                        <Form.Control
                            type="text"
                            value={config.searxng_domain}
                            onChange={(e) => setConfig({...config, searxng_domain: e.target.value})}
                            placeholder="e.g. https://your.searxng.instance"
                        />
                    </Form.Group>


                    <Button variant="primary" onClick={() => {
                        handleConfigChange(config.searxng_domain)
                    }}>
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
                        onClick={() => {
                            // Save API settings to the database
                            axios.post("/api/api-settings", {
                                api_url: apiUrl,
                                api_key: apiKey
                            })
                            .then(res => {
                                alert("API settings saved successfully!");
                            })
                            .catch(err => {
                                console.error("Error saving API settings:", err);
                                alert("Error saving API settings: " + (err.response?.data?.error || err.message));
                            });
                        }}
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
                        {models.map((model, idx) => (<option key={idx} value={model}>
                            {model}
                        </option>))}
                    </Form.Select>
                    {/*<Button variant="outline-primary" onClick={refreshModels}>*/}
                    {/*    Refresh (GET)*/}
                    {/*</Button>*/}
                    <Button variant="outline-secondary" onClick={handleRefreshModels}>
                        Refresh
                    </Button>
                </InputGroup>
            </Card.Body>
        </Card>

        {/* Chat Section */}
        <Card className="shadow">
            <Card.Header className="bg-primary text-white">
                <h2 className="h5 mb-0">Chat</h2>
            </Card.Header>
            <Card.Body>
                <div
                    className="bg-light p-3 mb-3 rounded"
                    style={{
                        height: '300px', overflowY: 'auto'
                    }}
                >
                    <ListGroup variant="flush">
                        {chatHistory.map((msg, idx) => (<ListGroup.Item
                            key={idx}
                            className={`border-0 ${msg.sender === 'Bot' ? 'bg-light' : 'bg-white'}`}
                        >
                            <strong className={msg.sender === 'Bot' ? 'text-primary' : 'text-success'}>
                                {msg.sender}:
                            </strong> {msg.text}
                        </ListGroup.Item>))}
                    </ListGroup>
                </div>
                <InputGroup>
                    <Form.Control
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type your message..."
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendMessage();
                        }}
                    />
                    <Button variant="primary" onClick={handleSendMessage}>
                        Send
                    </Button>
                </InputGroup>
                <Form className="mt-3 d-flex flex-row">
                    <Form.Group className="mb-3 me-3">
                        <Form.Check
                            type="checkbox"
                            id="searxng-enabled"
                            label="SearxNG Enabled"
                            checked={config.searxng_enabled}
                            onChange={(e) => {
                                const newConfig = {...config, searxng_enabled: e.target.checked};
                                setConfig(newConfig);
                                // Pass the new config directly to handleConfigChange
                                handleConfigChange(newConfig);
                            }}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3 me-3">
                        <Form.Check
                            type="checkbox"
                            id="deep-thinking"
                            label="Deep Thinking Enabled"
                            checked={config.deep_thinking}
                            onChange={(e) => {
                                const newConfig = {...config, deep_thinking: e.target.checked};
                                setConfig(newConfig);
                                // Pass the new config directly to handleConfigChange
                                handleConfigChange(newConfig);
                            }}
                        />
                    </Form.Group>
                </Form>
            </Card.Body>
        </Card>
    </Container>);
}
