// API Configuration
// You can use different APIs - configure your API key here
const API_CONFIG = {
    // Option 1: Hugging Face Inference API (Free tier available)
    // Get your API key from: https://huggingface.co/settings/tokens
    HUGGINGFACE_API_KEY: 'YOUR_HUGGINGFACE_API_KEY',
    HUGGINGFACE_MODEL: 'stabilityai/stable-diffusion-xl-base-1.0',
    
    // Option 2: OpenAI DALL-E API
    // Get your API key from: https://platform.openai.com/api-keys
    OPENAI_API_KEY: 'YOUR_OPENAI_API_KEY',
    
    // Option 3: Replicate API
    // Get your API key from: https://replicate.com/account/api-tokens
    REPLICATE_API_KEY: 'YOUR_REPLICATE_API_KEY',
    
    // Current API provider (change to 'huggingface', 'openai', or 'replicate')
    PROVIDER: 'huggingface' // Default to Hugging Face
};

// State Management
const state = {
    generatedImages: [],
    isGenerating: false
};

// DOM Elements
const promptInput = document.getElementById('promptInput');
const styleSelect = document.getElementById('styleSelect');
const sizeSelect = document.getElementById('sizeSelect');
const generateBtn = document.getElementById('generateBtn');
const imageContainer = document.getElementById('imageContainer');
const historySection = document.getElementById('historySection');
const historyGrid = document.getElementById('historyGrid');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    setupEventListeners();
    checkAPIKey();
});

// Event Listeners
function setupEventListeners() {
    generateBtn.addEventListener('click', handleGenerate);
    promptInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            handleGenerate();
        }
    });
}

// Check API Key
function checkAPIKey() {
    const provider = API_CONFIG.PROVIDER;
    let apiKey = '';
    
    switch(provider) {
        case 'huggingface':
            apiKey = API_CONFIG.HUGGINGFACE_API_KEY;
            break;
        case 'openai':
            apiKey = API_CONFIG.OPENAI_API_KEY;
            break;
        case 'replicate':
            apiKey = API_CONFIG.REPLICATE_API_KEY;
            break;
    }
    
    if (!apiKey || apiKey.includes('YOUR_')) {
        showToast('Please configure your API key in script.js', 'error');
    }
}

// Handle Generate Button Click
async function handleGenerate() {
    const prompt = promptInput.value.trim();
    
    if (!prompt) {
        showToast('Please enter a prompt to generate an image', 'error');
        promptInput.focus();
        return;
    }
    
    if (state.isGenerating) {
        return;
    }
    
    const style = styleSelect.value;
    const size = sizeSelect.value;
    
    await generateImage(prompt, style, size);
}

// Generate Image
async function generateImage(prompt, style, size) {
    state.isGenerating = true;
    updateGenerateButton(true);
    showLoadingState();
    
    try {
        // Enhance prompt with style
        const enhancedPrompt = enhancePromptWithStyle(prompt, style);
        
        let imageUrl;
        
        // Use different API based on provider
        switch(API_CONFIG.PROVIDER) {
            case 'huggingface':
                imageUrl = await generateWithHuggingFace(enhancedPrompt, size);
                break;
            case 'openai':
                imageUrl = await generateWithOpenAI(enhancedPrompt, size);
                break;
            case 'replicate':
                imageUrl = await generateWithReplicate(enhancedPrompt, size);
                break;
            default:
                throw new Error('Invalid API provider');
        }
        
        if (imageUrl) {
            displayGeneratedImage(imageUrl, enhancedPrompt);
            saveToHistory(imageUrl, enhancedPrompt);
            showToast('Image generated successfully!', 'success');
        } else {
            throw new Error('Failed to generate image');
        }
    } catch (error) {
        console.error('Error generating image:', error);
        showToast(`Error: ${error.message}`, 'error');
        showPlaceholder();
    } finally {
        state.isGenerating = false;
        updateGenerateButton(false);
    }
}

// Enhance Prompt with Style
function enhancePromptWithStyle(prompt, style) {
    const stylePrefixes = {
        realistic: 'photorealistic, high quality, detailed, ',
        artistic: 'artistic, creative, vibrant colors, masterpiece, ',
        anime: 'anime style, manga, Japanese animation, vibrant, ',
        fantasy: 'fantasy, magical, mystical, epic, ',
        cyberpunk: 'cyberpunk, futuristic, neon lights, sci-fi, ',
        minimalist: 'minimalist, simple, clean, elegant, '
    };
    
    return stylePrefixes[style] + prompt;
}

// Generate with Hugging Face API
async function generateWithHuggingFace(prompt, size) {
    const apiKey = API_CONFIG.HUGGINGFACE_API_KEY;
    
    if (!apiKey || apiKey.includes('YOUR_')) {
        throw new Error('Hugging Face API key not configured');
    }
    
    const response = await fetch(
        `https://api-inference.huggingface.co/models/${API_CONFIG.HUGGINGFACE_MODEL}`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    num_inference_steps: 50,
                    guidance_scale: 7.5
                }
            })
        }
    );
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate image');
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

// Generate with OpenAI DALL-E API
async function generateWithOpenAI(prompt, size) {
    const apiKey = API_CONFIG.OPENAI_API_KEY;
    
    if (!apiKey || apiKey.includes('YOUR_')) {
        throw new Error('OpenAI API key not configured');
    }
    
    const [width, height] = size.split('x').map(Number);
    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: `${width}x${height}`
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate image');
    }
    
    const data = await response.json();
    return data.data[0].url;
}

// Generate with Replicate API
async function generateWithReplicate(prompt, size) {
    const apiKey = API_CONFIG.REPLICATE_API_KEY;
    
    if (!apiKey || apiKey.includes('YOUR_')) {
        throw new Error('Replicate API key not configured');
    }
    
    const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            version: '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
            input: {
                prompt: prompt,
                width: parseInt(size.split('x')[0]),
                height: parseInt(size.split('x')[1])
            }
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate image');
    }
    
    const prediction = await response.json();
    
    // Poll for result
    let result = prediction;
    while (result.status === 'starting' || result.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
            headers: {
                'Authorization': `Token ${apiKey}`
            }
        });
        result = await statusResponse.json();
    }
    
    if (result.status === 'succeeded') {
        return result.output[0];
    } else {
        throw new Error('Image generation failed');
    }
}

// Display Generated Image
function displayGeneratedImage(imageUrl, prompt) {
    imageContainer.innerHTML = `
        <div class="generated-image-wrapper">
            <img src="${imageUrl}" alt="Generated image" class="generated-image" id="generatedImage">
            <div class="image-actions">
                <button class="action-btn download" onclick="downloadImage('${imageUrl}', '${prompt.replace(/'/g, "\\'")}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Image
                </button>
                <button class="action-btn" onclick="regenerateImage()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    Regenerate
                </button>
                <button class="action-btn" onclick="shareImage('${imageUrl}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    Share
                </button>
            </div>
        </div>
    `;
    imageContainer.classList.add('has-image');
}

// Show Loading State
function showLoadingState() {
    imageContainer.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-spinner"></div>
            <div class="loading-text">Generating your image...</div>
        </div>
    `;
    imageContainer.classList.remove('has-image');
}

// Show Placeholder
function showPlaceholder() {
    imageContainer.innerHTML = `
        <div class="placeholder-content">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8.5 10C9.32843 10 10 9.32843 10 8.5C10 7.67157 9.32843 7 8.5 7C7.67157 7 7 7.67157 7 8.5C7 9.32843 7.67157 10 8.5 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 15L16 10L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p>Your generated image will appear here</p>
        </div>
    `;
    imageContainer.classList.remove('has-image');
}

// Update Generate Button
function updateGenerateButton(isGenerating) {
    const btnText = generateBtn.querySelector('.btn-text');
    const btnLoader = generateBtn.querySelector('.btn-loader');
    
    if (isGenerating) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'flex';
        generateBtn.disabled = true;
        generateBtn.classList.add('generating');
    } else {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        generateBtn.disabled = false;
        generateBtn.classList.remove('generating');
    }
}

// Download Image
function downloadImage(imageUrl, prompt) {
    fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-generated-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('Image downloaded successfully!', 'success');
        })
        .catch(error => {
            console.error('Download error:', error);
            showToast('Failed to download image', 'error');
        });
}

// Regenerate Image
function regenerateImage() {
    handleGenerate();
}

// Share Image
async function shareImage(imageUrl) {
    if (navigator.share) {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'ai-generated-image.png', { type: 'image/png' });
            
            await navigator.share({
                title: 'AI Generated Image',
                text: 'Check out this AI generated image!',
                files: [file]
            });
            showToast('Image shared successfully!', 'success');
        } catch (error) {
            console.error('Share error:', error);
            copyImageUrl(imageUrl);
        }
    } else {
        copyImageUrl(imageUrl);
    }
}

// Copy Image URL
function copyImageUrl(imageUrl) {
    navigator.clipboard.writeText(imageUrl).then(() => {
        showToast('Image URL copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy URL', 'error');
    });
}

// Save to History
function saveToHistory(imageUrl, prompt) {
    const historyItem = {
        id: Date.now(),
        imageUrl,
        prompt,
        timestamp: new Date().toISOString()
    };
    
    state.generatedImages.unshift(historyItem);
    
    // Keep only last 20 images
    if (state.generatedImages.length > 20) {
        state.generatedImages = state.generatedImages.slice(0, 20);
    }
    
    localStorage.setItem('aiImageHistory', JSON.stringify(state.generatedImages));
    updateHistoryDisplay();
}

// Load History
function loadHistory() {
    const saved = localStorage.getItem('aiImageHistory');
    if (saved) {
        try {
            state.generatedImages = JSON.parse(saved);
            updateHistoryDisplay();
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }
}

// Update History Display
function updateHistoryDisplay() {
    if (state.generatedImages.length === 0) {
        historySection.style.display = 'none';
        return;
    }
    
    historySection.style.display = 'block';
    historyGrid.innerHTML = state.generatedImages.map(item => `
        <div class="history-item" onclick="loadHistoryImage('${item.imageUrl}', '${item.prompt.replace(/'/g, "\\'")}')">
            <img src="${item.imageUrl}" alt="${item.prompt}" loading="lazy">
            <div class="history-item-overlay">
                <button>View</button>
            </div>
        </div>
    `).join('');
}

// Load History Image
function loadHistoryImage(imageUrl, prompt) {
    displayGeneratedImage(imageUrl, prompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show Toast Notification
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Make functions globally available for onclick handlers
window.downloadImage = downloadImage;
window.regenerateImage = regenerateImage;
window.shareImage = shareImage;
window.loadHistoryImage = loadHistoryImage;
