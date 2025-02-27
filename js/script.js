class HalftoneProcessor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.effect = new HalftoneEffect(canvas, this.ctx);
        this.settings = {
            dotSize: 8,
            contrast: 100,
            pattern: 'elipse',
            negative: false
        };
    }

    async processImage(file) {
        const img = await this.loadImage(file);
        this.setupCanvas(img);
        
        // Pass the current settings to the effect
        this.effect.updateSettings(this.settings);
        this.effect.process(img);
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    setupCanvas(img) {
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / img.width);
        this.canvas.width = img.width * scale;
        this.canvas.height = img.height * scale;
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        // When settings are updated, also update the effect's settings
        this.effect.updateSettings(this.settings);
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('preview-canvas');
    const ctx = canvas.getContext('2d');
    const processor = new HalftoneProcessor(canvas);
    const dropZone = document.getElementById('upload-container');
    const fileInput = document.getElementById('file-input');
    const exportImageBtn = document.getElementById('export-image');
    const exportVideoBtn = document.getElementById('export-video');
    const loadingIndicator = document.querySelector('.loading-indicator');
    
    let currentFile = null;
    let activeVideoProcessor = null;

    // Setup controls
    const controls = {
        dotSize: document.getElementById('dot-size'),
        contrast: document.getElementById('contrast'),
        patterns: document.querySelectorAll('input[name="pattern"]'),
        modes: document.querySelectorAll('input[name="mode"]'),
        patternColor: document.getElementById('pattern-color'),
        resetColor: document.getElementById('reset-color'),
        overlayColor: document.getElementById('overlay-color'),
        overlayOpacity: document.getElementById('overlay-opacity')
    };

    // Add this inside the DOMContentLoaded event listener
    const themeToggle = document.getElementById('themeToggle');
    const root = document.documentElement;
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        root.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    // Event listeners
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        handleFile(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFile(file);
    });

    function handleFile(file) {
        if (!file) return;
        
        // Clear previous content and stop any active processing
        if (activeVideoProcessor) {
            activeVideoProcessor.stop();
            activeVideoProcessor = null;
        }
        
        // Reset canvas and show loading indicator
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        loadingIndicator.style.display = 'block';
        
        // Store the current file
        currentFile = file;
        
        if (file.type.startsWith('image/')) {
            processor.processImage(file).then(() => {
                // Update UI
                loadingIndicator.style.display = 'none';
                exportImageBtn.classList.remove('disabled');
                exportVideoBtn.classList.add('disabled');
            }).catch(error => {
                console.error('Error processing image:', error);
                loadingIndicator.style.display = 'none';
            });
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.loop = true;
            
            video.onloadedmetadata = () => {
                // Set canvas size
                const maxWidth = 800;
                const scale = Math.min(1, maxWidth / video.videoWidth);
                canvas.width = video.videoWidth * scale;
                canvas.height = video.videoHeight * scale;
                
                // Initialize video processor
                const videoProcessor = new VideoProcessor(video, canvas, ctx, processor.settings);
                videoProcessor.halftoneEffect = processor.effect; // Share the same effect instance
                activeVideoProcessor = videoProcessor;
                
                video.play();
                videoProcessor.start();
                
                // Update UI
                loadingIndicator.style.display = 'none';
                exportImageBtn.classList.add('disabled');
                exportVideoBtn.classList.remove('disabled');
            };
            
            video.onerror = () => {
                console.error('Error loading video');
                loadingIndicator.style.display = 'none';
            };
        } else {
            alert('Please upload an image or video file.');
            loadingIndicator.style.display = 'none';
        }
    }

    // Control event listeners
    controls.dotSize.addEventListener('input', updateEffect);
    controls.contrast.addEventListener('input', updateEffect);
    
    controls.patterns.forEach(btn => {
        btn.addEventListener('change', (e) => {
            const parentLabel = e.target.closest('.radio-option');
            document.querySelectorAll('.radio-option').forEach(label => {
                label.classList.remove('active');
            });
            parentLabel.classList.add('active');
            processor.updateSettings({ pattern: e.target.value });
            if (currentFile) processor.processImage(currentFile);
            
            // Update active video processor if exists
            if (activeVideoProcessor) {
                activeVideoProcessor.updateSettings({ pattern: e.target.value });
            }
        });
    });

    controls.modes.forEach(mode => {
        mode.addEventListener('change', (e) => {
            const parentLabel = e.target.closest('.radio-option');
            document.querySelectorAll('input[name="mode"]').forEach(input => {
                input.closest('.radio-option').classList.remove('active');
            });
            parentLabel.classList.add('active');
            const isNegative = e.target.value === 'negative';
            processor.updateSettings({ negative: isNegative });
            
            if (currentFile && currentFile.type.startsWith('image/')) {
                processor.processImage(currentFile);
            }
            
            // Update active video processor if exists
            if (activeVideoProcessor) {
                activeVideoProcessor.updateSettings({ negative: isNegative });
            }
        });
    });

    controls.patternColor.addEventListener('input', updateColors);

    controls.resetColor.addEventListener('click', () => {
        controls.patternColor.value = '#000000';
        updateColors();
    });

    controls.overlayColor.addEventListener('input', updateOverlay);
    controls.overlayOpacity.addEventListener('input', updateOverlay);

    function updateEffect(e) {
        // Convert kebab-case to camelCase properly
        const setting = e.target.id.replace(/-([a-z])/g, function(match, letter) {
            return letter.toUpperCase();
        });
        const value = parseInt(e.target.value);
        e.target.nextElementSibling.textContent = setting === 'contrast' ? value + '%' : value;
        
        // Update processor settings
        processor.updateSettings({ [setting]: value });
        
        // Update image if it's loaded
        if (currentFile && currentFile.type.startsWith('image/')) {
            processor.processImage(currentFile);
        }
        
        // Update active video processor if exists
        if (activeVideoProcessor) {
            activeVideoProcessor.updateSettings({ [setting]: value });
        }
    }

    function updateColors() {
        processor.updateSettings({ 
            color: controls.patternColor.value
        });
        if (currentFile) processor.processImage(currentFile);
    }

    function updateOverlay() {
        const opacity = controls.overlayOpacity.value;
        controls.overlayOpacity.nextElementSibling.textContent = opacity + '%';
        
        processor.updateSettings({
            overlayColor: controls.overlayColor.value,
            overlayOpacity: opacity
        });
        
        if (currentFile) processor.processImage(currentFile);
        
        // Update video processor if active
        if (activeVideoProcessor) {
            activeVideoProcessor.updateSettings({
                overlayColor: controls.overlayColor.value,
                overlayOpacity: opacity
            });
        }
    }

    // Export functionality
    exportImageBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'halftone-export.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
    
    exportVideoBtn.addEventListener('click', () => {
        if (activeVideoProcessor) {
            // Change button text to show recording status
            exportVideoBtn.textContent = 'Recording...';
            exportVideoBtn.classList.add('recording');
            
            // Get video duration or use 5 seconds as default
            const videoDuration = activeVideoProcessor.video.duration ? 
                Math.min(activeVideoProcessor.video.duration * 1000, 10000) : 5000;
            
            // Start recording with progress feedback
            const recordingDuration = activeVideoProcessor.startRecording(videoDuration);
            
            // Reset button after recording is complete
            setTimeout(() => {
                exportVideoBtn.textContent = 'Export Video';
                exportVideoBtn.classList.remove('recording');
            }, recordingDuration + 500); // Add a small buffer
        }
    });

    // Handle theme toggle
    themeToggle.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        root.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
        
        // Save preference
        localStorage.setItem('theme', newTheme);
    });

    function updateThemeIcon(theme) {
        sunIcon.style.display = theme === 'light' ? 'none' : 'block';
        moonIcon.style.display = theme === 'light' ? 'block' : 'none';
    }
});