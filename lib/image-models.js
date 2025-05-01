/**
 * Configuration for different image generation models
 * This defines the parameters each model accepts and their UI representation
 */

// Base model configuration class
class ImageModelConfig {
    constructor(name, provider) {
        this.name = name;
        this.provider = provider;
    }

    // Get parameters to include in API request
    getRequestParams(formValues) {
        // Default implementation - override in subclasses
        return formValues;
    }

    // Get UI components specific to this model
    getUIComponents() {
        // Default UI components - override in subclasses
        return {
            showSafetyTolerance: true,
            showGuidanceScale: true,
            showInferenceSteps: true,
            showSeed: true,
            showOutputFormat: true,
            showNumImages: true,
            maxNumImages: 4,
            minWidth: 256,
            maxWidth: 1440,
            minHeight: 256,
            maxHeight: 1440,
            widthStep: 32,
            heightStep: 32,
            requireMultipleOf32: true
        };
    }

    // Validate parameters before sending request
    validateParams(params) {
        // Default validation - override in subclasses
        return { valid: true };
    }
}

// Flux Pro model configuration
class FluxProModelConfig extends ImageModelConfig {
    constructor() {
        super("flux-pro", "AIML");
    }

    getRequestParams(formValues) {
        const {
            prompt,
            width,
            height,
            numInferenceSteps,
            guidanceScale,
            safetyTolerance,
            outputFormat,
            numImages,
            seed
        } = formValues;

        // Build the payload specific to flux-pro
        const payload = {
            model: "flux-pro",
            prompt,
            image_size: {
                width: parseInt(width),
                height: parseInt(height)
            },
            num_inference_steps: parseInt(numInferenceSteps),
            guidance_scale: parseFloat(guidanceScale),
            safety_tolerance: safetyTolerance,
            output_format: outputFormat,
            num_images: parseInt(numImages)
        };

        // Add seed if provided
        if (seed) {
            payload.seed = parseInt(seed);
        }

        return payload;
    }

    validateParams(params) {
        const { width, height } = params.image_size;

        // Check if width and height are multiples of 32
        if (width % 32 !== 0 || height % 32 !== 0) {
            return {
                valid: false,
                error: "Width and height must be multiples of 32 for flux-pro model"
            };
        }

        // Check if width and height are within valid range
        if (width < 256 || width > 1440 || height < 256 || height > 1440) {
            return {
                valid: false,
                error: "Width and height must be between 256 and 1440 for flux-pro model"
            };
        }

        return { valid: true };
    }
}

// Stable Diffusion model configuration
class StableDiffusionModelConfig extends ImageModelConfig {
    constructor() {
        super("stable-diffusion", "Stability AI");
    }

    getRequestParams(formValues) {
        const {
            prompt,
            width,
            height,
            numInferenceSteps,
            guidanceScale,
            safetyTolerance,
            outputFormat,
            numImages,
            seed,
            negativePrompt // Additional parameter specific to SD
        } = formValues;

        // Build the payload specific to stable-diffusion
        const payload = {
            model: "stable-diffusion",
            prompt,
            negative_prompt: negativePrompt || "",
            width: parseInt(width),
            height: parseInt(height),
            num_inference_steps: parseInt(numInferenceSteps),
            guidance_scale: parseFloat(guidanceScale),
            safety_checker: safetyTolerance !== "high", // Convert to boolean
            samples: parseInt(numImages),
            response_format: outputFormat
        };

        // Add seed if provided
        if (seed) {
            payload.seed = parseInt(seed);
        }

        return payload;
    }

    getUIComponents() {
        return {
            ...super.getUIComponents(),
            showNegativePrompt: true,
            minWidth: 512,
            maxWidth: 1024,
            minHeight: 512,
            maxHeight: 1024,
            widthStep: 64,
            heightStep: 64,
            requireMultipleOf32: false,
            requireMultipleOf64: true
        };
    }

    validateParams(params) {
        const { width, height } = params;

        // Check if width and height are multiples of 64
        if (width % 64 !== 0 || height % 64 !== 0) {
            return {
                valid: false,
                error: "Width and height must be multiples of 64 for stable-diffusion model"
            };
        }

        // Check if width and height are within valid range
        if (width < 512 || width > 1024 || height < 512 || height > 1024) {
            return {
                valid: false,
                error: "Width and height must be between 512 and 1024 for stable-diffusion model"
            };
        }

        return { valid: true };
    }
}

// DALL-E model configuration
class DalleModelConfig extends ImageModelConfig {
    constructor() {
        super("dall-e-3", "OpenAI");
    }

    getRequestParams(formValues) {
        const {
            prompt,
            outputFormat,
            size, // DALL-E uses predefined sizes
            quality,
            style
        } = formValues;

        // Build the payload specific to DALL-E
        return {
            model: "dall-e-3",
            prompt,
            n: 1, // DALL-E 3 only supports 1 image per request
            size: size || "1024x1024",
            quality: quality || "standard",
            style: style || "vivid",
            response_format: outputFormat === "png" ? "b64_json" : "url"
        };
    }

    getUIComponents() {
        return {
            showSafetyTolerance: false,
            showGuidanceScale: false,
            showInferenceSteps: false,
            showSeed: false,
            showOutputFormat: true,
            showNumImages: false,
            showSizePresets: true,
            showQualityOption: true,
            showStyleOption: true,
            sizeOptions: [
                { value: "1024x1024", label: "Square (1024×1024)" },
                { value: "1792x1024", label: "Landscape (1792×1024)" },
                { value: "1024x1792", label: "Portrait (1024×1792)" }
            ],
            qualityOptions: [
                { value: "standard", label: "Standard" },
                { value: "hd", label: "HD" }
            ],
            styleOptions: [
                { value: "vivid", label: "Vivid" },
                { value: "natural", label: "Natural" }
            ]
        };
    }
}


// Default configuration for all models
const defaultModelConfig = {
    getUIComponents: () => [],
    getRequestParams: (formValues) => {
        // Create base payload with common parameters
        const payload = {
            prompt: formValues.prompt,
            model: formValues.model,
        };

        // Add image size parameters
        payload.image_size = {
            width: parseInt(formValues.width),
            height: parseInt(formValues.height)
        };

        // Add optional parameters only if they exist in formValues
        if ('numInferenceSteps' in formValues) {
            payload.num_inference_steps = parseInt(formValues.numInferenceSteps);
        }

        if ('guidanceScale' in formValues) {
            payload.guidance_scale = parseFloat(formValues.guidanceScale);
        }

        if ('safetyTolerance' in formValues) {
            payload.safety_tolerance = formValues.safetyTolerance;
        }

        if ('outputFormat' in formValues) {
            payload.output_format = formValues.outputFormat;
        }

        if ('numImages' in formValues) {
            payload.num_images = parseInt(formValues.numImages);
        }

        if (formValues.seed) {
            payload.seed = parseInt(formValues.seed);
        }

        return payload;
    },
    validateParams: (params) => ({ valid: true })
};

// OpenAI DALL-E model configuration
const dalleModelConfig = {
    getUIComponents: () => [
        {
            type: 'select',
            name: 'size',
            label: 'Image Size',
            options: [
                { value: '1024x1024', label: '1024x1024 (Square)' },
                { value: '1024x1792', label: '1024x1792 (Portrait)' },
                { value: '1792x1024', label: '1792x1024 (Landscape)' }
            ],
            helpText: 'Select the size of the generated image'
        },
        {
            type: 'select',
            name: 'quality',
            label: 'Image Quality',
            options: [
                { value: 'standard', label: 'Standard' },
                { value: 'hd', label: 'HD' }
            ],
            helpText: 'Higher quality images take longer to generate'
        },
        {
            type: 'select',
            name: 'style',
            label: 'Style',
            options: [
                { value: 'vivid', label: 'Vivid' },
                { value: 'natural', label: 'Natural' }
            ],
            helpText: 'Vivid favors vibrant colors and contrast, Natural favors subtle, realistic images'
        }
    ],
    getRequestParams: (formValues) => {
        // Create a clean payload with only DALL-E specific parameters
        const payload = {
            prompt: formValues.prompt,
            model: formValues.model || 'dall-e-3', // Force the correct model name
            size: formValues.size || '1024x1024',
            quality: formValues.quality || 'standard',
            style: formValues.style || 'vivid',
            n: 1 // DALL-E 3 only supports 1 image per request
        };

        // Add response format if specified
        if (formValues.outputFormat) {
            payload.response_format = formValues.outputFormat === 'png' ? 'b64_json' : 'url';
        }

        return payload;
    },
    validateParams: (params) => {
        if (!params.prompt || params.prompt.trim() === '') {
            return { valid: false, error: 'Prompt is required' };
        }
        return { valid: true };
    }
};

// Stability AI model configuration
const stabilityAIModelConfig = {
    getUIComponents: () => [
        {
            type: 'text',
            name: 'negativePrompt',
            label: 'Negative Prompt',
            placeholder: 'What to exclude from the image...',
            helpText: 'Specify what you don\'t want to see in the generated image'
        }
    ],
    getRequestParams: (formValues) => {
        // Create a clean payload with only Stability AI specific parameters
        const payload = {
            prompt: formValues.prompt,
            model: formValues.model
        };

        // Add negative prompt if provided
        if ('negativePrompt' in formValues) {
            payload.negative_prompt = formValues.negativePrompt || '';
        }

        // Add dimension parameters
        if ('width' in formValues) {
            payload.width = parseInt(formValues.width);
        }

        if ('height' in formValues) {
            payload.height = parseInt(formValues.height);
        }

        // Add other parameters
        if ('numInferenceSteps' in formValues) {
            payload.num_inference_steps = parseInt(formValues.numInferenceSteps);
        }

        if ('guidanceScale' in formValues) {
            payload.guidance_scale = parseFloat(formValues.guidanceScale);
        }

        if ('numImages' in formValues) {
            payload.num_images = parseInt(formValues.numImages);
        }

        // Add seed only if provided
        if (formValues.seed) {
            payload.seed = parseInt(formValues.seed);
        }

        return payload;
    },
    validateParams: (params) => {
        if (!params.prompt || params.prompt.trim() === '') {
            return { valid: false, error: 'Prompt is required' };
        }
        return { valid: true };
    }
};

// // Factory function to get the appropriate model config
// export function getModelConfig(modelName) {
//     const modelConfigs = {
//         "flux-pro": new FluxProModelConfig(),
//         "stable-diffusion": new StableDiffusionModelConfig(),
//         "dall-e-3": new DalleModelConfig()
//     };
//
//     // Return the specific model config or a default one
//     return modelConfigs[modelName] || new ImageModelConfig(modelName, "Unknown");
// }

// Get model configuration based on model name
    export function getModelConfig(modelName) {
        if (!modelName) return defaultModelConfig;

        // Check if model name contains specific provider keywords
        if (modelName.toLowerCase().includes('dall-e') || modelName.toLowerCase().includes('openai')) {
            return dalleModelConfig;
        } else if (modelName.toLowerCase().includes('stable-diffusion') || modelName.toLowerCase().includes('stability') || modelName.toLowerCase().includes('sdxl')) {
            return stabilityAIModelConfig;
        }

        // Default fallback
        return defaultModelConfig;
    }

// Get all available model configurations
export function getAllModelConfigs() {
    return [
        new FluxProModelConfig(),
        new StableDiffusionModelConfig(),
        new DalleModelConfig()
    ];
}