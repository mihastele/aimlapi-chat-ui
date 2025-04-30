// pages/index.js

import {useState, useEffect, useRef} from "react";
import axios from "axios";
import {Container, Row, Col, Form, Button, Card, ListGroup, InputGroup, Dropdown, Navbar, Nav, OverlayTrigger, Tooltip} from 'react-bootstrap';
import {useRouter} from 'next/router';
import Cookies from 'js-cookie';
// At the top of your file, add these imports
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { FaCog, FaCube, FaCopy, FaImage } from 'react-icons/fa';


export default function Home() {
    const router = useRouter();
    const [config, setConfig] = useState({
        searxng_enabled: false, searxng_domain: "", searxng_engine: "google", deep_thinking: false,
    });
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [apiUrl, setApiUrl] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [selectedModel, setSelectedModel] = useState("gpt-3.5");
    const [models, setModels] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [searchEngines] = useState(["google", "bing", "duckduckgo", "yahoo", "brave"]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [modelSearchTerm, setModelSearchTerm] = useState("");
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [totalTokens, setTotalTokens] = useState(0);
    const [selectedModelType, setSelectedModelType] = useState("chat-completion");
    const chatEndRef = useRef(null);

    // Filter models based on search term and model type
    const filteredModels = models.filter(model => 
        model.name.toLowerCase().includes(modelSearchTerm.toLowerCase()) &&
        model.type === selectedModelType
    );

    // Function to create a new chat session
    const createNewChatSession = () => {
        axios
            .post("/api/chat-history", {action: "create_session"})
            .then((res) => {
                const sessionId = res.data.sessionId;
                setCurrentSessionId(sessionId);
                // Save session ID in cookie (expires in 7 days)
                Cookies.set('chat_session_id', sessionId, { expires: 14 });
                setChatHistory([]);
            })
            .catch((err) => console.error("Error creating chat session:", err));
    };

    // Function to load chat messages for a session
    const loadChatMessages = (sessionId) => {
        axios
            .get(`/api/chat-history?sessionId=${sessionId}`)
            .then((res) => {
                const formattedMessages = res.data.messages.map(msg => ({
                    sender: msg.sender,
                    text: msg.message
                }));
                setChatHistory(formattedMessages);
            })
            .catch((err) => console.error("Error loading chat messages:", err));
    };

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

        const existingSessionId = Cookies.get('chat_session_id');
        if (existingSessionId) {
            setCurrentSessionId(existingSessionId);
            // Load messages for this session
            loadChatMessages(existingSessionId);
        } else {
            // Create a new chat session if no existing session
            createNewChatSession();
        }

        refreshModels();
    }, []);

    // Function to refresh models
    const refreshModels = () => {
        axios
            .get("/api/models")
            .then((res) => {
                setModels(res.data.models);
                // If there are models and the selected model is not in the filtered list,
                // select the first model of the selected type
                if (res.data.models.length > 0) {
                    const modelsOfSelectedType = res.data.models.filter(model => model.type === selectedModelType);
                    if (modelsOfSelectedType.length > 0) {
                        const modelExists = modelsOfSelectedType.some(model => model.name === selectedModel);
                        if (!modelExists) {
                            setSelectedModel(modelsOfSelectedType[0].name);
                            localStorage.setItem('selectedModel', modelsOfSelectedType[0].name);
                        }
                    }
                }
            })
            .catch((err) => console.error("Error getting models:", err));
    };

    // Function to refresh the models via the refresh endpoint
    const handleRefreshModels = () => {
        axios
            .post("/api/models-refresh")
            .then((res) => {
                setModels(res.data.models);
                // If there are models and the selected model is not in the filtered list,
                // select the first model of the selected type
                if (res.data.models.length > 0) {
                    const modelsOfSelectedType = res.data.models.filter(model => model.type === selectedModelType);
                    if (modelsOfSelectedType.length > 0) {
                        const modelExists = modelsOfSelectedType.some(model => model.name === selectedModel);
                        if (!modelExists) {
                            setSelectedModel(modelsOfSelectedType[0].name);
                            localStorage.setItem('selectedModel', modelsOfSelectedType[0].name);
                        }
                    }
                }
            })
            .catch((err) => console.error("Error refreshing models:", err));
    };

    // Auto-scroll to bottom of chat when new messages arrive
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory]);

    // Handler to send a chat message
    const handleSendMessage = () => {
        if (!chatInput.trim()) return;

        // Create a new session if one doesn't exist
        if (!currentSessionId) {
            axios
                .post("/api/chat-history", {action: "create_session"})
                .then((res) => {
                    setCurrentSessionId(res.data.sessionId);
                    sendMessage(res.data.sessionId);
                })
                .catch((err) => console.error("Error creating chat session:", err));
        } else {
            sendMessage(currentSessionId);
        }
    };

    // Function to send message to API with streaming
    const sendMessage = (sessionId) => {
        // Update chat history with the user message
        const userMessage = {sender: "User", text: chatInput};
        setChatHistory((prev) => [...prev, userMessage]);

        // Store the message to clear the input field
        const currentMessage = chatInput;
        setChatInput("");

        // Add a placeholder for the bot response
        const placeholderIndex = chatHistory.length + 1; // +1 for the user message we just added
        setChatHistory((prev) => [...prev, {sender: "Bot", text: ""}]);

        // Set streaming state to true
        setIsStreaming(true);

        // Initialize the response text
        let responseText = '';

        // Send the POST request for streaming
        fetch('/api/chat-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: currentMessage,
                api_url: apiUrl,
                api_key: apiKey,
                model: selectedModel,
                sessionId: sessionId
            })
        })
        .then(response => {
            // Create a reader for the response body stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            // Function to process the stream
            function processStream() {
                // Read from the stream
                reader.read().then(({ done, value }) => {
                    // If the stream is done, set streaming to false
                    if (done) {
                        setIsStreaming(false);
                        return;
                    }

                    // Decode the chunk
                    const chunk = decoder.decode(value, { stream: true });

                    // Process each line in the chunk
                    const lines = chunk.split('\n\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));

                                // If there's a chunk, add it to the response
                                if (data.chunk) {
                                    responseText += data.chunk;

                                    // Update the bot message with the current accumulated response
                                    setChatHistory((prev) => {
                                        const newHistory = [...prev];
                                        newHistory[placeholderIndex] = {sender: "Bot", text: responseText};
                                        return newHistory;
                                    });
                                }

                                // If there's an error, show it
                                if (data.error) {
                                    responseText += `\n\nError: ${data.error}`;
                                    setChatHistory((prev) => {
                                        const newHistory = [...prev];
                                        newHistory[placeholderIndex] = {sender: "Bot", text: responseText};
                                        return newHistory;
                                    });
                                }

                                // If we're done, stop streaming
                                if (data.done) {
                                    setIsStreaming(false);

                                    // Update token information if available
                                    if (data.tokens) {
                                        // Update the last message with token information
                                        setChatHistory((prev) => {
                                            const newHistory = [...prev];
                                            const lastBotMessageIndex = newHistory.length - 1;
                                            if (lastBotMessageIndex >= 0 && newHistory[lastBotMessageIndex].sender === 'Bot') {
                                                newHistory[lastBotMessageIndex] = {
                                                    ...newHistory[lastBotMessageIndex],
                                                    tokens: data.tokens
                                                };
                                            }
                                            return newHistory;
                                        });
                                    }

                                    // Update total tokens if available
                                    if (data.total_tokens) {
                                        setTotalTokens(data.total_tokens);
                                    }

                                    return;
                                }
                            } catch (error) {
                                console.error('Error parsing event data:', error);
                            }
                        }
                    }

                    // Continue processing the stream
                    processStream();
                }).catch(err => {
                    console.error("Error reading stream:", err);
                    setIsStreaming(false);

                    // Update the bot message with the error
                    setChatHistory((prev) => {
                        const newHistory = [...prev];
                        newHistory[placeholderIndex] = {
                            sender: "Bot", 
                            text: responseText || `Error: ${err.message}`
                        };
                        return newHistory;
                    });
                });
            }

            // Start processing the stream
            processStream();
        })
        .catch(err => {
            console.error("Error initiating stream:", err);
            setIsStreaming(false);

            // Update the bot message with the error
            setChatHistory((prev) => {
                const newHistory = [...prev];
                newHistory[placeholderIndex] = {
                    sender: "Bot", 
                    text: `Error: ${err.message}`
                };
                return newHistory;
            });
        });
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

    return (
        <div className="d-flex flex-column vh-100">
            {/* Navbar */}
            <Navbar bg="primary" variant="dark" expand="lg" className="px-3">
                <Navbar.Brand href="#" className="me-auto">AIMLAPI Chat UI</Navbar.Brand>
                {totalTokens > 0 && (
                    <div className="text-light me-3">
                        <small>Total Tokens: <span className="badge bg-light text-dark">{totalTokens.toLocaleString()}</span></small>
                    </div>
                )}
                <Nav>
                    {/*<Dropdown className="me-2 my-2">*/}
                    {/*    <Dropdown.Toggle variant="light" size="sm" style={{ width: '150px', textOverflow: 'ellipsis', overflow: 'hidden' }}>*/}
                    {/*        {selectedModelType === 'chat-completion' ? 'Chat Models' : selectedModelType === 'image' ? 'Image Models' : selectedModelType}*/}
                    {/*    </Dropdown.Toggle>*/}
                    {/*    <Dropdown.Menu>*/}
                    {/*        <Dropdown.Item */}
                    {/*            onClick={() => setSelectedModelType('chat-completion')}*/}
                    {/*            active={selectedModelType === 'chat-completion'}*/}
                    {/*        >*/}
                    {/*            Chat Models*/}
                    {/*        </Dropdown.Item>*/}
                    {/*        <Dropdown.Item */}
                    {/*            onClick={() => setSelectedModelType('image')}*/}
                    {/*            active={selectedModelType === 'image'}*/}
                    {/*        >*/}
                    {/*            Image Models*/}
                    {/*        </Dropdown.Item>*/}
                    {/*    </Dropdown.Menu>*/}
                    {/*</Dropdown>*/}
                    <Dropdown
                        className="me-2 my-2"
                        show={showModelDropdown}
                        onToggle={(isOpen) => setShowModelDropdown(isOpen)}
                    >
                        <Dropdown.Toggle variant="light" size="sm" style={{ width: '200px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {selectedModel}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ width: '250px', maxHeight: '300px', overflow: 'auto' }}>
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
                                            setSelectedModel(model.name);
                                            // Save selected model to localStorage
                                            localStorage.setItem('selectedModel', model.name);

                                            // Save selected model to database config
                                            axios.post("/api/config", {
                                                ...config,
                                                selected_model: model.name
                                            })
                                                .then((res) => setConfig(res.data))
                                                .catch((err) => console.error("Error updating selected model in config:", err));

                                            setShowModelDropdown(false);
                                            setModelSearchTerm("");
                                        }}
                                        active={model.name === selectedModel}
                                    >
                                        {model.name} <small className="text-muted">({model.provider})</small>
                                    </Dropdown.Item>
                                ))
                            ) : (
                                <Dropdown.Item disabled>No models found</Dropdown.Item>
                            )}
                        </Dropdown.Menu>
                    </Dropdown>
                    <Button 
                        variant="light"
                        size="sm"
                        className="me-2 my-2"
                        onClick={handleRefreshModels}
                        title="Refresh model list"
                    >
                        <i className="fas fa-sync-alt"></i> Refresh Models
                    </Button>
                    <Button
                        variant="outline-light"
                        size="sm" 
                        className="me-5 my-2"
                        onClick={createNewChatSession}
                    >
                        New Chat
                    </Button>
                    <div className="me-5"></div>
                    <Button
                        variant="outline-light" 
                        size="sm" 
                        className="me-2 my-2"
                        onClick={() => router.push('/model-generator')}
                    >
                        <FaCube className="me-1" /> 3D Model
                    </Button>
                    <Button 
                        variant="outline-light" 
                        size="sm" 
                        className="me-2 my-2"
                        onClick={() => router.push('/image-generator')}
                    >
                        <FaImage className="me-1" /> Image Generator
                    </Button>
                    <Button
                        className="me-2 my-2"
                        variant="outline-light" 
                        size="sm"
                        onClick={() => router.push('/settings')}
                    >
                        <FaCog className="me-1" /> Settings
                    </Button>
                </Nav>
            </Navbar>

            {/* Chat Container */}
            <div className="flex-grow-1 d-flex flex-column p-3">
                {/* Chat Messages */}
                <div
                    className="flex-grow-1 bg-light p-3 rounded mb-3"
                    style={{ overflowY: 'auto' }}
                >
                    <ListGroup variant="flush">
                        {chatHistory.map((msg, idx) => (
                            <ListGroup.Item
                                key={idx}
                                className={`border-0 mb-2 rounded ${msg.sender === 'Bot' ? 'bot-message' : 'user-message'}`}
                            >
                                <div className="message-header d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong className={msg.sender === 'Bot' ? 'text-primary' : 'text-success'}>
                                            {msg.sender}
                                        </strong>
                                        {msg.sender === 'Bot' && idx === chatHistory.length - 1 && isStreaming && (
                                            <span className="ms-2 badge bg-info">Streaming...</span>
                                        )}
                                    </div>
                                    {msg.tokens > 0 && (
                                        <span className="badge bg-secondary">
                                            {msg.tokens} tokens
                                        </span>
                                    )}
                                </div>
                                <div className="message-content">
                                    {msg.sender === 'Bot' ? (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code({node, inline, className, children, ...props}) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline && match ? (
                                                        <div className="position-relative">
                                                            <div className="position-absolute top-0 end-0 m-1">
                                                                <OverlayTrigger
                                                                    placement="top"
                                                                    overlay={<Tooltip>Copy code</Tooltip>}
                                                                >
                                                                    <Button 
                                                                        variant="light" 
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(String(children));
                                                                        }}
                                                                    >
                                                                        <FaCopy />
                                                                    </Button>
                                                                </OverlayTrigger>
                                                            </div>
                                                            <SyntaxHighlighter
                                                                style={vscDarkPlus}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                {...props}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        </div>
                                                    ) : (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    ) : (
                                        <div>{msg.text}</div>
                                    )}
                                </div>
                            </ListGroup.Item>
                        ))}
                        <div ref={chatEndRef} />
                    </ListGroup>
                </div>

                {/* Chat Input */}
                <div>
                    <InputGroup className="mb-2">
                        <Form.Control
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Type your message..."
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !isStreaming) handleSendMessage();
                            }}
                            disabled={isStreaming}
                        />
                        <Button 
                            variant="primary" 
                            onClick={handleSendMessage}
                            disabled={isStreaming || !chatInput.trim()}
                        >
                            {isStreaming ? 'Streaming...' : 'Send'}
                        </Button>
                    </InputGroup>
                    <div className="d-flex">
                        <Form.Check
                            type="checkbox"
                            id="searxng-enabled"
                            label="SearxNG Enabled"
                            checked={config.searxng_enabled}
                            onChange={(e) => {
                                const newConfig = {...config, searxng_enabled: e.target.checked};
                                setConfig(newConfig);
                                handleConfigChange(newConfig);
                            }}
                            className="me-3"
                        />
                        <Form.Check
                            type="checkbox"
                            id="deep-thinking"
                            label="Deep Thinking Enabled"
                            checked={config.deep_thinking}
                            onChange={(e) => {
                                const newConfig = {...config, deep_thinking: e.target.checked};
                                setConfig(newConfig);
                                handleConfigChange(newConfig);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
