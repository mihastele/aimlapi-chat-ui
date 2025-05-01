// pages/image-generator.js

import { useState, useEffect } from "react";
import {Container, Row, Col, Form, Button, Card, Alert, Spinner, Image, InputGroup} from 'react-bootstrap';
import axios from "axios";
import { useRouter } from 'next/router';
import { FaImage, FaCube, FaCog, FaSync } from 'react-icons/fa';
import { getModelConfig } from '../lib/image-models';




export default function ImageGenerator() {
    const [prompt, setPrompt] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [imageUrl, setImageUrl] = useState(null);
    const [generatedBatch, setGeneratedBatch] = useState([]);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [model, setModel] = useState("")
    const [models, setModels] = useState([]);;
    const [width, setWidth] = useState(1024);
    const [height, setHeight] = useState(1024);
    const [numInferenceSteps, setNumInferenceSteps] = useState(30);
    const [guidanceScale, setGuidanceScale] = useState(7.5);
    const [safetyTolerance, setSafetyTolerance] = useState(1);
    const [outputFormat, setOutputFormat] = useState("jpeg");
    const [numImages, setNumImages] = useState(1);
    const [seed, setSeed] = useState("");
    const [isRefreshingModels, setIsRefreshingModels] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    // Add this import at the top of your file
    // Inside your component, add this state
    const [selectedPreset, setSelectedPreset] = useState("Square (1024×1024)");
    // Add these state variables at the top with your other state declarations
    const [negativePrompt, setNegativePrompt] = useState("");
    const [selectedSize, setSelectedSize] = useState("1024x1024");
    const [selectedQuality, setSelectedQuality] = useState("standard");
    const [selectedStyle, setSelectedStyle] = useState("vivid");

    // Define image size presets (all values are multiples of 32)
    const IMAGE_SIZE_PRESETS = [
        // Default size
        { name: "Default (1024×768)", width: 1024, height: 768, note: "(32 MUL)" },

        // Square formats
        { name: "Min Square (256×256)", width: 256, height: 256, note: "(32 MUL)" },
        { name: "Square (512×512)", width: 512, height: 512, note: "(32 MUL)" },
        { name: "Square (768×768)", width: 768, height: 768, note: "(32 MUL)" },
        { name: "Square (1024×1024)", width: 1024, height: 1024, note: "(32 MUL)" },
        { name: "Max Square (1440×1440)", width: 1440, height: 1440, note: "(32 MUL)" },

        // Portrait formats
        { name: "Portrait (512×768)", width: 512, height: 768, note: "(32 MUL)" },
        { name: "Portrait (768×1024)", width: 768, height: 1024, note: "(32 MUL)" },
        { name: "Portrait (832×1216)", width: 832, height: 1216, note: "(32 MUL)" },

        // Landscape formats
        { name: "Landscape (768×512)", width: 768, height: 512, note: "(32 MUL)" },
        { name: "Landscape (1024×768)", width: 1024, height: 768, note: "(32 MUL)" },
        { name: "Landscape (1216×832)", width: 1216, height: 832, note: "(32 MUL)" },

        // Widescreen formats
        { name: "Widescreen (1024×576)", width: 1024, height: 576, note: "(32 MUL)" },
        { name: "Widescreen (1280×720)", width: 1280, height: 720, note: "(32 MUL)" },
        { name: "Widescreen (1408×768)", width: 1408, height: 768, note: "(32 MUL)" },

        // Banner formats
        { name: "Banner (1024×320)", width: 1024, height: 320, note: "(32 MUL)" },
        { name: "Wide Banner (1280×384)", width: 1280, height: 384, note: "(32 MUL)" },
        { name: "Slim Banner (1024×256)", width: 1024, height: 256, note: "(32 MUL)" },

        // Custom option
        { name: "Custom", width: 1024, height: 768, note: "(32 MUL)" }
    ];

// Get model configuration based on model name
//     export function getModelConfig(modelName) {
//         if (!modelName) return defaultModelConfig;
//
//         // Check if model name contains specific provider keywords
//         if (modelName.toLowerCase().includes('dall-e') || modelName.toLowerCase().includes('openai')) {
//             return dalleModelConfig;
//         } else if (modelName.toLowerCase().includes('stability') || modelName.toLowerCase().includes('sdxl')) {
//             return stabilityAIModelConfig;
//         }
//
//         // Default fallback
//         return defaultModelConfig;
//     }


    // // Inside your component, add this function
    // const getModelSpecificUI = () => {
    //     // Get the configuration for the currently selected model
    //     const modelConfig = getModelConfig(model);
    //     const uiComponents = modelConfig.getUIComponents();
    //
    //     return uiComponents;
    // };

    // Update the getModelSpecificUI function to handle missing model configs
    const getModelSpecificUI = () => {
        // Get the configuration for the currently selected model
        const modelConfig = getModelConfig(model);

        // If no model is selected or the model config doesn't exist, return empty array
        if (!model || !modelConfig) {
            return [];
        }

        // Get UI components from the model config
        try {
            return modelConfig.getUIComponents();
        } catch (error) {
            console.error("Error getting UI components for model:", error);
            return [];
        }
    };

    // Add this function to prepare the request payload
    const prepareRequestPayload = () => {
        try {
            // Get the configuration for the currently selected model
            const modelConfig = getModelConfig(model);

            if (!modelConfig) {
                throw new Error("No configuration found for the selected model");
            }

            // Collect all form values
            const formValues = {
                prompt,
                model,
                width,
                height,
                numInferenceSteps,
                guidanceScale,
                safetyTolerance,
                outputFormat,
                numImages,
                seed,
                // Add any model-specific parameters here
                negativePrompt,
                size: selectedSize,
                quality: selectedQuality,
                style: selectedStyle
            };

            // Get model-specific request parameters
            const payload = modelConfig.getRequestParams(formValues);

            // Validate the parameters
            const validation = modelConfig.validateParams(payload);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            return payload;
        } catch (error) {
            setError(`Error preparing request: ${error.message}`);
            throw error;
        }
    };

    // Update your handleGenerateImage function
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
            // Prepare the request payload based on the selected model
            const payload = prepareRequestPayload();

            const response = await axios.post("/api/image-generation", payload);

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

    const router = useRouter();

    // Function to load models from API
    const loadModels = () => {
        setIsLoadingModels(true);
        axios.get("/api/models")
            .then((res) => {
                // Filter models by type 'image'
                const imageModels = res.data.models.filter(model => model.type === 'image');
                setModels(imageModels);

                // Set default model if available
                if (imageModels.length > 0 && !model) {
                    setModel(imageModels[0].name);
                }
                setIsLoadingModels(false);
            })
            .catch((err) => {
                console.error("Error loading models:", err);
                setIsLoadingModels(false);
            });
    };

    // Add this function to handle preset changes
    const handlePresetChange = (e) => {
        const presetName = e.target.value;
        setSelectedPreset(presetName);

        // Find the selected preset
        const preset = IMAGE_SIZE_PRESETS.find(p => p.name === presetName);
        if (preset) {
            // Update width and height based on the preset
            setWidth(preset.width);
            setHeight(preset.height);
        }
    };

    // Function to refresh models from API
    const handleRefreshModels = () => {
        setIsLoadingModels(true);
        axios.post("/api/models-refresh")
            .then((res) => {
                // Filter models by type 'image'
                const imageModels = res.data.models.filter(model => model.type === 'image');
                setModels(imageModels);

                // Set default model if available
                if (imageModels.length > 0 && !model) {
                    setModel(imageModels[0].name);
                }
                setIsLoadingModels(false);
            })
            .catch((err) => {
                console.error("Error refreshing models:", err);
                setIsLoadingModels(false);
            });
    };

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

        // // Load models
        //         // loadModels();
        handleRefreshModels()

        // Load previously generated images
        loadGeneratedImages();

        // // Load models
        // refreshModels();
    }, []);

    // // Function to refresh models from the database
    // const refreshModels = () => {
    //     axios.get("/api/models")
    //         .then((res) => setModels(res.data.models))
    //         .catch((err) => console.error("Error getting models:", err));
    // };

    // // Function to refresh models from the API
    // const handleRefreshModels = () => {
    //     setIsRefreshingModels(true);
    //     axios.post("/api/models-refresh")
    //         .then((res) => {
    //             setModels(res.data.models);
    //             setIsRefreshingModels(false);
    //         })
    //         .catch((err) => {
    //             console.error("Error refreshing models:", err);
    //             setIsRefreshingModels(false);
    //             setError(`Failed to refresh models: ${err.response?.data?.error || err.message}`);
    //         });
    // };

    // Load previously generated images
    const loadGeneratedImages = async () => {
        try {
            const response = await axios.get("/api/images");
            setGeneratedImages(response.data.images);
        } catch (err) {
            console.error("Error loading generated images:", err);
        }
    };

    // // Generate image from prompt
    // const handleGenerateImage = async () => {
    //     if (!prompt.trim()) {
    //         setError("Please enter a prompt");
    //         return;
    //     }
    //
    //     if (!apiKey) {
    //         setError("API key is required. Please set it in the settings page.");
    //         return;
    //     }
    //
    //     setIsLoading(true);
    //     setError(null);
    //     setImageUrl(null);
    //     setGeneratedBatch([]);
    //
    //     try {
    //         const response = await axios.post("/api/image-generation", {
    //             prompt,
    //             model,
    //             image_size: {
    //                 width: parseInt(width),
    //                 height: parseInt(height)
    //             },
    //             num_inference_steps: parseInt(numInferenceSteps),
    //             guidance_scale: parseFloat(guidanceScale),
    //             safety_tolerance: safetyTolerance,
    //             output_format: outputFormat,
    //             num_images: parseInt(numImages),
    //             seed: seed ? parseInt(seed) : undefined
    //         });
    //
    //         // Set the first image URL for backward compatibility
    //         setImageUrl(response.data.image_url);
    //
    //         // Set the batch of generated images if available
    //         if (response.data.images && response.data.images.length > 0) {
    //             setGeneratedBatch(response.data.images);
    //         } else {
    //             // Fallback for backward compatibility
    //             setGeneratedBatch([{
    //                 image_url: response.data.image_url,
    //                 width: response.data.width,
    //                 height: response.data.height
    //             }]);
    //         }
    //
    //         setIsLoading(false);
    //
    //         // Refresh the list of generated images
    //         loadGeneratedImages();
    //
    //     } catch (err) {
    //         console.error("Error generating image:", err);
    //         setError(`Error: ${err.response?.data?.error || err.message}`);
    //         setIsLoading(false);
    //     }
    // };

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
                                    <div className="d-flex">
                                        <Form.Select
                                            value={model}
                                            onChange={(e) => setModel(e.target.value)}
                                            disabled={isLoading || isLoadingModels}
                                            className="me-2"
                                        >
                                            {models.length > 0 ? (
                                                models.map((m, idx) => (
                                                    <option key={idx} value={m.name}>
                                                        {m.name} ({m.provider})
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="">No image models available</option>
                                            )}
                                        </Form.Select>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={handleRefreshModels}
                                            disabled={isLoadingModels}
                                            title="Refresh model list"
                                        >
                                            {isLoadingModels ? (
                                                <Spinner animation="border" size="sm" />
                                            ) : (
                                                <FaSync />
                                            )}
                                        </Button>
                                    </div>
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

                        {/*// Add this JSX before your width and height inputs*/}
                        <Form.Group className="mb-3">
                            <Form.Label>Size Preset {selectedPreset !== "Custom" && <span className="text-muted small">{IMAGE_SIZE_PRESETS.find(p => p.name === selectedPreset)?.note}</span>}</Form.Label>
                            <Form.Select
                                value={selectedPreset}
                                onChange={handlePresetChange}
                                className="mb-2"
                            >
                                {IMAGE_SIZE_PRESETS.map((preset, index) => (
                                    <option key={index} value={preset.name}>
                                        {preset.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Width (256-1440, multiple of 32)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={width}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            // Ensure value is within range and a multiple of 32
                                            if (value >= 256 && value <= 1440) {
                                                const adjustedValue = Math.round(value / 32) * 32;
                                                setWidth(adjustedValue);
                                                // Set to custom when manually changed
                                                setSelectedPreset("Custom");
                                            }
                                        }}
                                        min={256}
                                        max={1440}
                                        step={32}
                                    />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Height (256-1440, multiple of 32)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={height}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            // Ensure value is within range and a multiple of 32
                                            if (value >= 256 && value <= 1440) {
                                                const adjustedValue = Math.round(value / 32) * 32;
                                                setHeight(adjustedValue);
                                                // Set to custom when manually changed
                                                setSelectedPreset("Custom");
                                            }
                                        }}
                                        min={256}
                                        max={1440}
                                        step={32}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>


                        {/*<Row>*/}
                        {/*    <Col md={6}>*/}
                        {/*        <Form.Group className="mb-3">*/}
                        {/*            <Form.Label>Width</Form.Label>*/}
                        {/*            <Form.Control*/}
                        {/*                type="number"*/}
                        {/*                value={width}*/}
                        {/*                onChange={(e) => setWidth(e.target.value)}*/}
                        {/*                min="64"*/}
                        {/*                max="2048"*/}
                        {/*                step="64"*/}
                        {/*                disabled={isLoading}*/}
                        {/*            />*/}
                        {/*        </Form.Group>*/}
                        {/*    </Col>*/}
                        {/*    <Col md={6}>*/}
                        {/*        <Form.Group className="mb-3">*/}
                        {/*            <Form.Label>Height</Form.Label>*/}
                        {/*            <Form.Control*/}
                        {/*                type="number"*/}
                        {/*                value={height}*/}
                        {/*                onChange={(e) => setHeight(e.target.value)}*/}
                        {/*                min="64"*/}
                        {/*                max="2048"*/}
                        {/*                step="64"*/}
                        {/*                disabled={isLoading}*/}
                        {/*            />*/}
                        {/*        </Form.Group>*/}
                        {/*    </Col>*/}
                        {/*</Row>*/}

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
                                        <option value="1">Low (Strict)</option>
                                        <option value="3">Medium</option>
                                        <option value="6">High</option>
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
                                {/*<Form.Group className="d-none">*/}
                                {/*    <Form.Label>Number of Images</Form.Label>*/}
                                {/*    <Form.Control*/}
                                {/*        type="number"*/}
                                {/*        value="1"*/}
                                {/*        onChange={(e) => setNumImages(e.target.value)}*/}
                                {/*        min="1"*/}
                                {/*        max="4"*/}
                                {/*        disabled={isLoading}*/}
                                {/*    />*/}
                                {/*</Form.Group>*/}
                            </Col>
                        </Row>

                        {/* Model-specific UI components */}
                        {model && (
                            <div className="mb-3 p-3 border rounded bg-light">
                                <h5>Model-specific settings</h5>
                                {getModelSpecificUI().map((component, index) => {
                                    // Render different UI components based on type
                                    if (component.type === 'text') {
                                        return (
                                            <Form.Group className="mb-3" key={index}>
                                                <Form.Label>{component.label}</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={
                                                        component.name === 'negativePrompt' ? negativePrompt :
                                                            component.name === 'style' ? selectedStyle :
                                                                ''
                                                    }
                                                    onChange={(e) => {
                                                        if (component.name === 'negativePrompt') setNegativePrompt(e.target.value);
                                                        else if (component.name === 'style') setSelectedStyle(e.target.value);
                                                    }}
                                                    placeholder={component.placeholder || ''}
                                                    disabled={isLoading}
                                                />
                                                {component.helpText && (
                                                    <Form.Text className="text-muted">
                                                        {component.helpText}
                                                    </Form.Text>
                                                )}
                                            </Form.Group>
                                        );
                                    } else if (component.type === 'select') {
                                        return (
                                            <Form.Group className="mb-3" key={index}>
                                                <Form.Label>{component.label}</Form.Label>
                                                <Form.Select
                                                    value={
                                                        component.name === 'size' ? selectedSize :
                                                            component.name === 'quality' ? selectedQuality :
                                                                component.name === 'style' ? selectedStyle :
                                                                    ''
                                                    }
                                                    onChange={(e) => {
                                                        if (component.name === 'size') setSelectedSize(e.target.value);
                                                        else if (component.name === 'quality') setSelectedQuality(e.target.value);
                                                        else if (component.name === 'style') setSelectedStyle(e.target.value);
                                                    }}
                                                    disabled={isLoading}
                                                >
                                                    {component.options.map((option, idx) => (
                                                        <option key={idx} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                                {component.helpText && (
                                                    <Form.Text className="text-muted">
                                                        {component.helpText}
                                                    </Form.Text>
                                                )}
                                            </Form.Group>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        )}

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
