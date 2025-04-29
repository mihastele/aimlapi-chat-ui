// pages/model-generator.js

import { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import axios from "axios";
import { useRouter } from 'next/router';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function ModelGenerator() {
    const [imageUrl, setImageUrl] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [modelUrl, setModelUrl] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [showViewer, setShowViewer] = useState(false);
    
    const router = useRouter();
    const canvasRef = useRef(null);
    const sceneRef = useRef(null);
    
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
                setError("Failed to load API settings. Please ensure you have set your API key in the main page.");
            });
    }, []);
    
    // Initialize 3D viewer when showViewer is true and canvasRef is available
    useEffect(() => {
        if (showViewer && canvasRef.current && modelUrl) {
            initThreeJS();
        }
        
        // Cleanup function to dispose of Three.js resources
        return () => {
            if (sceneRef.current) {
                disposeThreeJS();
            }
        };
    }, [showViewer, modelUrl]);
    
    // Initialize Three.js scene
    const initThreeJS = () => {
        const canvas = canvasRef.current;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        
        const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        camera.position.z = 5;
        
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        
        // Load the model
        const loader = new GLTFLoader();
        loader.load(
            modelUrl,
            (gltf) => {
                scene.add(gltf.scene);
                
                // Center and scale the model
                const box = new THREE.Box3().setFromObject(gltf.scene);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3 / maxDim;
                gltf.scene.scale.set(scale, scale, scale);
                
                gltf.scene.position.x = -center.x * scale;
                gltf.scene.position.y = -center.y * scale;
                gltf.scene.position.z = -center.z * scale;
                
                // Animation loop
                const animate = () => {
                    requestAnimationFrame(animate);
                    controls.update();
                    renderer.render(scene, camera);
                };
                
                animate();
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
            },
            (error) => {
                console.error('An error happened while loading the model:', error);
                setError('Failed to load 3D model for viewing. You can still download it.');
            }
        );
        
        // Handle window resize
        const handleResize = () => {
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        };
        
        window.addEventListener('resize', handleResize);
        
        // Store references for cleanup
        sceneRef.current = {
            scene,
            camera,
            renderer,
            controls,
            cleanup: () => {
                window.removeEventListener('resize', handleResize);
            }
        };
    };
    
    // Dispose of Three.js resources
    const disposeThreeJS = () => {
        if (sceneRef.current) {
            sceneRef.current.cleanup();
            sceneRef.current.renderer.dispose();
            sceneRef.current = null;
        }
    };
    
    // Generate 3D model from image URL
    const handleGenerateModel = async () => {
        if (!imageUrl.trim()) {
            setError("Please enter an image URL");
            return;
        }
        
        if (!apiKey) {
            setError("API key is required. Please set it in the main page.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setModelUrl(null);
        setFileName(null);
        setShowViewer(false);
        
        try {
            const response = await axios.post(
                "https://api.aimlapi.com/v1/images/generations",
                {
                    model: "triposr",
                    image_url: imageUrl,
                },
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    }
                }
            );
            
            setModelUrl(response.data.model_mesh.url);
            setFileName(response.data.model_mesh.file_name);
            setIsLoading(false);
            
        } catch (err) {
            console.error("Error generating model:", err);
            setError(`Error: ${err.response?.data?.error || err.message}`);
            setIsLoading(false);
        }
    };
    
    // Download the generated model
    const handleDownloadModel = async () => {
        if (!modelUrl || !fileName) {
            setError("No model available to download");
            return;
        }
        
        try {
            const response = await axios.get(modelUrl, {
                responseType: 'blob'
            });
            
            // Create a download link and trigger it
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
        } catch (err) {
            console.error("Error downloading model:", err);
            setError(`Error downloading model: ${err.message}`);
        }
    };
    
    return (
        <Container className="py-4">
            <Row className="mb-4">
                <Col>
                    <h1 className="text-primary">3D Model Generator</h1>
                    <Button 
                        variant="outline-primary" 
                        onClick={() => router.push('/')}
                        className="mb-3"
                    >
                        Back to Chat
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
                    <h2 className="h5 mb-0">Generate 3D Model from Image</h2>
                </Card.Header>
                <Card.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Image URL</Form.Label>
                            <Form.Control
                                type="text"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                disabled={isLoading}
                            />
                            <Form.Text className="text-muted">
                                Enter the URL of an image to convert to a 3D model
                            </Form.Text>
                        </Form.Group>
                        
                        <Button 
                            variant="primary" 
                            onClick={handleGenerateModel}
                            disabled={isLoading || !imageUrl.trim()}
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
                            ) : "Generate 3D Model"}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
            
            {modelUrl && (
                <Card className="mb-4 shadow-sm">
                    <Card.Header className="bg-success text-white">
                        <h2 className="h5 mb-0">3D Model Generated Successfully</h2>
                    </Card.Header>
                    <Card.Body>
                        <p>Your 3D model has been generated and is ready for download.</p>
                        <p><strong>File name:</strong> {fileName}</p>
                        
                        <div className="d-flex gap-2 mb-3">
                            <Button 
                                variant="success" 
                                onClick={handleDownloadModel}
                            >
                                Download 3D Model
                            </Button>
                            
                            <Button 
                                variant="outline-primary" 
                                onClick={() => setShowViewer(!showViewer)}
                            >
                                {showViewer ? "Hide 3D Viewer" : "Show 3D Viewer"}
                            </Button>
                        </div>
                        
                        {showViewer && (
                            <div className="mt-3">
                                <h3 className="h6">3D Model Preview</h3>
                                <div 
                                    style={{ 
                                        width: '100%', 
                                        height: '400px', 
                                        position: 'relative',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <canvas 
                                        ref={canvasRef} 
                                        style={{ 
                                            width: '100%', 
                                            height: '100%' 
                                        }} 
                                    />
                                </div>
                                <p className="text-muted mt-2">
                                    Tip: Click and drag to rotate, scroll to zoom
                                </p>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            )}
        </Container>
    );
}