// pages/image-generator.js

import { useState, useEffect } from "react";
import {Container, Row, Col, Form, Button, Card, Alert, Spinner, Image, InputGroup} from 'react-bootstrap';
import axios from "axios";
import { useRouter } from 'next/router';
import { FaImage, FaCube, FaCog } from 'react-icons/fa';

export default function ImageGenerator() {
    const [prompt, setPrompt] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [imageUrl, setImageUrl] = useState(null);
    const [generatedBatch, setGeneratedBatch] = useState([]);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [model, setModel] = useState("flux-pro");
    const [models, setModels] = useState([]);
    const [width, setWidth] = useState(1024);
    const [height, setHeight] = useState(1024);
    const [numInferenceSteps, setNumInferenceSteps] = useState(30);
    const [guidanceScale, setGuidanceScale] = useState(7.5);
    const [safetyTolerance, setSafetyTolerance] = useState("medium");
    const [outputFormat, setOutputFormat] = useState("jpeg");
    const [numImages, setNumImages] = useState(1);
    const [seed, setSeed] = useState("");
    const [isRefreshingModels, setIsRefreshingModels] = useState(false);

    const router = useRouter();

    // Load API key from database on component mount
    useEffect(() => {
        axios.get("/api/api-settings")
            .then((res) => {
                if (res.data.api_key && res.data.api_key !== "********") {
                    setApiKey(res.data.api_key);
                }
            })
            .catch((err) => {
                console.error("Error getting API settings:", err);
                setError("Failed to load API settings. Please ensure you have set your API key in the settings page.");
            });

        // Load previously generated images
        loadGeneratedImages();

        // Load models
        refreshModels();
    }, []);

    // Function to refresh models from the database
    const refreshModels = () => {
        axios.get("/api/models")
            .then((res) => setModels(res.data.models))
            .catch((err) => console.error("Error getting models:", err));
    };

    // Function to refresh models from the API
    const handleRefreshModels = () => {
        setIsRefreshingModels(true);
        axios.post("/api/models-refresh")
            .then((res) => {
                setModels(res.data.models);
                setIsRefreshingModels(false);
            })
            .catch((err) => {
                console.error("Error refreshing models:", err);
                setIsRefreshingModels(false);
                setError(`Failed to refresh models: ${err.response?.data?.error || err.message}`);
            });
    };

    // Load previously generated images
    const loadGeneratedImages = async () => {
        try {
            const response = await axios.get("/api/images");
            setGeneratedImages(response.data.images);
        } catch (err) {
            console.error("Error loading generated images:", err);
        }
    };

    // Generate image from prompt
    const handleGenerateImage = async () => {
        if (!prompt.trim()) {
            setError("Please enter a prompt");
            return;
        }

        if (!apiKey) {
            setError("API key is required. Please set it in the settings page.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setImageUrl(null);
        setGeneratedBatch([]);

        try {
            const response = await axios.post("/api/image-generation", {
                prompt,
                model,
                image_size: {
                    width: parseInt(width),
                    height: parseInt(height)
                },
                num_inference_steps: parseInt(numInferenceSteps),
                guidance_scale: parseFloat(guidanceScale),
                safety_tolerance: safetyTolerance,
                output_format: outputFormat,
                num_images: parseInt(numImages),
                seed: seed ? parseInt(seed) : undefined
            });

            // Set the first image URL for backward compatibility
            setImageUrl(response.data.image_url);

            // Set the batch of generated images if available
            if (response.data.images && response.data.images.length > 0) {
                setGeneratedBatch(response.data.images);
            } else {
                // Fallback for backward compatibility
                setGeneratedBatch([{
                    image_url: response.data.image_url,
                    width: response.data.width,
                    height: response.data.height
                }]);
            }

            setIsLoading(false);

            // Refresh the list of generated images
            loadGeneratedImages();

        } catch (err) {
            console.error("Error generating image:", err);
            setError(`Error: ${err.response?.data?.error || err.message}`);
            setIsLoading(false);
        }
    };

    return (
        <Container className="py-4">
            <Row className="mb-4">
                <Col>
                    <h1 className="text-primary"><FaImage className="me-2" />Image Generator</h1>
                    <Button 
                        variant="outline-primary" 
                        onClick={() => router.push('/')}
                        className="mb-3 me-2"
                    >
                        Back to Chat
                    </Button>
                    <Button 
                        variant="outline-primary" 
                        onClick={() => router.push('/settings')}
                        className="mb-3 me-2"
                    >
                        <FaCog className="me-1" /> Settings
                    </Button>
                    <Button 
                        variant="outline-primary" 
                        onClick={() => router.push('/model-generator')}
                        className="mb-3"
                    >
                        <FaCube className="me-1" /> 3D Model Generator
                    </Button>
                </Col>
            </Row>

            {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                    {error}
                </Alert>
            )}

            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-primary text-white">
                    <h2 className="h5 mb-0">Generate Image</h2>
                </Card.Header>
                <Card.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Prompt</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe the image you want to generate..."
                                disabled={isLoading}
                            />
                        </Form.Group>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Model</Form.Label>
                                    <InputGroup>
                                        <Form.Select
                                            value={model}
                                            onChange={(e) => setModel(e.target.value)}
                                            disabled={isLoading || isRefreshingModels}
                                        >
                                            {models.length > 0 ? (
                                                models.map((modelName, idx) => (
                                                    <option key={idx} value={modelName}>
                                                        {modelName}
                                                    </option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="flux-pro">Flux Pro</option>
                                                    <option value="flux">Flux</option>
                                                </>
                                            )}
                                        </Form.Select>
                                        <Button 
                                            variant="outline-secondary"
                                            onClick={handleRefreshModels}
                                            disabled={isLoading || isRefreshingModels}
                                        >
                                            {isRefreshingModels ? (
                                                <Spinner
                                                    as="span"
                                                    animation="border"
                                                    size="sm"
                                                    role="status"
                                                    aria-hidden="true"
                                                />
                                            ) : "Refresh"}
                                        </Button>
                                    </InputGroup>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Output Format</Form.Label>
                                    <Form.Select
                                        value={outputFormat}
                                        onChange={(e) => setOutputFormat(e.target.value)}
                                        disabled={isLoading}
                                    >
                                        <option value="jpeg">JPEG</option>
                                        <option value="png">PNG</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Width</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={width}
                                        onChange={(e) => setWidth(e.target.value)}
                                        min="64"
                                        max="2048"
                                        step="64"
                                        disabled={isLoading}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Height</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                        min="64"
                                        max="2048"
                                        step="64"
                                        disabled={isLoading}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Inference Steps</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={numInferenceSteps}
                                        onChange={(e) => setNumInferenceSteps(e.target.value)}
                                        min="1"
                                        max="100"
                                        disabled={isLoading}
                                    />
                                    <Form.Text className="text-muted">
                                        Higher values = better quality but slower (20-50 recommended)
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Guidance Scale</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={guidanceScale}
                                        onChange={(e) => setGuidanceScale(e.target.value)}
                                        min="1"
                                        max="20"
                                        step="0.5"
                                        disabled={isLoading}
                                    />
                                    <Form.Text className="text-muted">
                                        How closely to follow the prompt (7-9 recommended)
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Safety Tolerance</Form.Label>
                                    <Form.Select
                                        value={safetyTolerance}
                                        onChange={(e) => setSafetyTolerance(e.target.value)}
                                        disabled={isLoading}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Number of Images</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={numImages}
                                        onChange={(e) => setNumImages(e.target.value)}
                                        min="1"
                                        max="4"
                                        disabled={isLoading}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Seed (Optional)</Form.Label>
                            <Form.Control
                                type="number"
                                value={seed}
                                onChange={(e) => setSeed(e.target.value)}
                                placeholder="Leave empty for random seed"
                                disabled={isLoading}
                            />
                            <Form.Text className="text-muted">
                                Use the same seed to create similar images
                            </Form.Text>
                        </Form.Group>

                        <Button 
                            variant="primary" 
                            onClick={handleGenerateImage}
                            disabled={isLoading || !prompt.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                        className="me-2"
                                    />
                                    Generating...
                                </>
                            ) : "Generate Image"}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>

            {generatedBatch.length > 0 && (
                <Card className="mb-4 shadow-sm">
                    <Card.Header className="bg-success text-white">
                        <h2 className="h5 mb-0">Generated Images</h2>
                    </Card.Header>
                    <Card.Body>
                        <Row>
                            {generatedBatch.map((image, index) => (
                                <Col key={index} md={generatedBatch.length > 1 ? 6 : 12} className="mb-3 text-center">
                                    <Image 
                                        src={image.image_url} 
                                        alt={`Generated image ${index + 1}`} 
                                        fluid 
                                        className="mb-3"
                                        style={{ maxHeight: '500px' }}
                                    />
                                    <div>
                                        <Button 
                                            variant="primary" 
                                            href={image.image_url} 
                                            target="_blank"
                                            className="me-2"
                                        >
                                            Open Full Size
                                        </Button>
                                        <Button 
                                            variant="outline-primary" 
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = image.image_url;
                                                link.download = `generated-image-${Date.now()}-${index}.${outputFormat}`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }}
                                        >
                                            Download
                                        </Button>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </Card.Body>
                </Card>
            )}

            {generatedImages.length > 0 && (
                <Card className="shadow-sm">
                    <Card.Header className="bg-primary text-white">
                        <h2 className="h5 mb-0">Previously Generated Images</h2>
                    </Card.Header>
                    <Card.Body>
                        <Row>
                            {generatedImages.map((img, idx) => (
                                <Col key={idx} md={4} className="mb-3">
                                    <Card>
                                        <Card.Img 
                                            variant="top" 
                                            src={img.image_url} 
                                            alt={`Generated image ${idx + 1}`}
                                            style={{ height: '200px', objectFit: 'cover' }}
                                        />
                                        <Card.Body>
                                            <Card.Text className="small text-truncate">
                                                {img.prompt}
                                            </Card.Text>
                                            <div className="d-flex justify-content-between">
                                                <small className="text-muted">
                                                    {new Date(img.created_at).toLocaleDateString()}
                                                </small>
                                                <small className="text-muted">
                                                    {img.model}
                                                </small>
                                            </div>
                                            <Button 
                                                variant="outline-primary" 
                                                size="sm" 
                                                className="mt-2 w-100"
                                                href={img.image_url}
                                                target="_blank"
                                            >
                                                View
                                            </Button>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </Card.Body>
                </Card>
            )}
        </Container>
    );
}
