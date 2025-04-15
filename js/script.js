class HalftoneProcessor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.effect = new HalftoneEffect(canvas, this.ctx);
        this.settings = {
            dotSize: 8,
            contrast: 100,
            pattern: 'elipse',
            negative: false,
            color: '#000000',
            overlayColor: '#ffffff',
            overlayOpacity: 0
        };
    }

    async processImage(file) {
        const img = await this.loadImage(file);
        this.setupCanvas(img);
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
        this.settings = { ...this.settings, ...newSettings, negative: false };
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
    const videoControls = document.querySelector('.video-controls');
    const tutorialOverlay = document.querySelector('.tutorial-overlay');
    
    let currentFile = null;
    let activeVideoProcessor = null;

    // Setup controls
    const controls = {
        dotSize: document.getElementById('dot-size'),
        contrast: document.getElementById('contrast'),
        patterns: document.querySelectorAll('input[name="pattern"]'),
        patternColor: document.getElementById('pattern-color'),
        patternColorPreview: document.getElementById('pattern-color-preview'),
        overlayColor: document.getElementById('overlay-color'),
        overlayColorPreview: document.getElementById('overlay-color-preview'),
        videoFormat: document.querySelectorAll('input[name="video-format"]'),
        videoQuality: document.querySelectorAll('input[name="video-quality"]'),
        videoFps: document.querySelectorAll('input[name="video-fps"]'),
        videoBitrate: document.querySelectorAll('input[name="video-bitrate"]')
    };

    // Theme handling
    const themeToggle = document.getElementById('themeToggle');
    const root = document.documentElement;
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        root.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    // File handling
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
        
        if (activeVideoProcessor) {
            activeVideoProcessor.stop();
            activeVideoProcessor = null;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        loadingIndicator.style.display = 'block';
        currentFile = file;
        
        // Hide tutorial when file is loaded
        tutorialOverlay.classList.add('hidden');
        
        // Hide video controls initially
        document.querySelector('.video-export-config').classList.remove('show');
        
        if (file.type.startsWith('image/')) {
            processor.processImage(file).then(() => {
                loadingIndicator.style.display = 'none';
                exportImageBtn.classList.remove('disabled');
                exportVideoBtn.classList.add('disabled');
            }).catch(error => {
                console.error('Error processing image:', error);
                loadingIndicator.style.display = 'none';
                tutorialOverlay.classList.remove('hidden');
            });
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.loop = true;
            
            video.onloadedmetadata = () => {
                const videoProcessor = new VideoProcessor(video, canvas, ctx, processor.settings);
                videoProcessor.halftoneEffect = processor.effect;
                
                // Apply initial video settings
                updateVideoSettings(videoProcessor);
                
                activeVideoProcessor = videoProcessor;
                video.play();
                videoProcessor.start();
                
                loadingIndicator.style.display = 'none';
                exportImageBtn.classList.add('disabled');
                exportVideoBtn.classList.remove('disabled');
                document.querySelector('.video-export-config').classList.add('show');
            };
            
            video.onerror = () => {
                console.error('Error loading video');
                loadingIndicator.style.display = 'none';
                tutorialOverlay.classList.remove('hidden');
            };
        } else {
            alert('Please upload an image or video file.');
            loadingIndicator.style.display = 'none';
            tutorialOverlay.classList.remove('hidden');
        }
    }

    function updateVideoSettings(videoProcessor) {
        // Update format
        const formatInput = document.querySelector('input[name="video-format"]:checked');
        if (formatInput) {
            videoProcessor.updateExportSettings({ format: formatInput.value });
        }

        // Update quality and resolution
        const qualityInput = document.querySelector('input[name="video-quality"]:checked');
        if (qualityInput) {
            const quality = qualityInput.value;
            videoProcessor.updateExportSettings({ quality });
            switch (quality) {
                case 'low':
                    videoProcessor.setProcessingResolution(854, 480); // 480p
                    break;
                case 'medium':
                    videoProcessor.setProcessingResolution(1280, 720); // 720p
                    break;
                case 'high':
                    videoProcessor.setProcessingResolution(1920, 1080); // 1080p
                    break;
            }
        }

        // Update quality (bitrate)
        const bitrateInput = document.querySelector('input[name="video-bitrate"]:checked');
        if (bitrateInput) {
            const bitrate = bitrateInput.value;
            videoProcessor.updateExportSettings({ bitrate });
        }

        // Update FPS
        const fpsInput = document.querySelector('input[name="video-fps"]:checked');
        if (fpsInput) {
            videoProcessor.updateExportSettings({ fps: parseInt(fpsInput.value) });
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
            
            if (activeVideoProcessor) {
                activeVideoProcessor.updateSettings({ pattern: e.target.value });
            }
        });
    });

    controls.patternColor.addEventListener('input', updateColors);
    controls.patternColorPreview.addEventListener('click', () => controls.patternColor.click());

    controls.overlayColor.addEventListener('input', updateOverlay);
    controls.overlayColorPreview.addEventListener('click', () => controls.overlayColor.click());

    // Video format controls
    controls.videoFormat.forEach(format => {
        format.addEventListener('change', (e) => {
            const parentLabel = e.target.closest('.radio-option');
            document.querySelectorAll('input[name="video-format"]').forEach(input => {
                input.closest('.radio-option').classList.remove('active');
            });
            parentLabel.classList.add('active');
            
            if (activeVideoProcessor) {
                activeVideoProcessor.updateExportSettings({ format: e.target.value });
            }
        });
    });

    // Video quality controls
    controls.videoQuality.forEach(quality => {
        quality.addEventListener('change', (e) => {
            const parentLabel = e.target.closest('.radio-option');
            document.querySelectorAll('input[name="video-quality"]').forEach(input => {
                input.closest('.radio-option').classList.remove('active');
            });
            parentLabel.classList.add('active');
            
            if (activeVideoProcessor) {
                updateVideoSettings(activeVideoProcessor);
            }
        });
    });

    // Video FPS controls
    controls.videoFps.forEach(fps => {
        fps.addEventListener('change', (e) => {
            const parentLabel = e.target.closest('.radio-option');
            document.querySelectorAll('input[name="video-fps"]').forEach(input => {
                input.closest('.radio-option').classList.remove('active');
            });
            parentLabel.classList.add('active');
            
            if (activeVideoProcessor) {
                activeVideoProcessor.updateExportSettings({ fps: parseInt(e.target.value) });
            }
        });
    });

    // Video bitrate controls
    controls.videoBitrate.forEach(bitrate => {
        bitrate.addEventListener('change', (e) => {
            const parentLabel = e.target.closest('.radio-option');
            const dropdownLabel = e.target.closest('.control-group').querySelector('.dropdown-label span');
            const qualityText = e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1);
            
            // Update dropdown label
            dropdownLabel.textContent = `Quality: ${qualityText}`;
            
            // Update active state
            e.target.closest('.radio-group').querySelectorAll('.radio-option').forEach(opt => {
                opt.classList.remove('active');
            });
            parentLabel.classList.add('active');
            
            if (activeVideoProcessor) {
                activeVideoProcessor.updateExportSettings({ bitrate: e.target.value });
            }
        });
    });

    function updateEffect(e) {
        const setting = e.target.id.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
        let value = parseInt(e.target.value);
        
        // Adjust dot size to minimum of 2 while showing UI value of 1
        if (setting === 'dotSize' && value === 1) {
            value = 2;
        }
        
        e.target.nextElementSibling.textContent = setting === 'contrast' ? value + '%' : e.target.value;
        
        processor.updateSettings({ [setting]: value });
        
        if (currentFile && currentFile.type.startsWith('image/')) {
            processor.processImage(currentFile);
        }
        
        if (activeVideoProcessor) {
            activeVideoProcessor.updateSettings({ [setting]: value });
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const debouncedProcessImage = debounce((processor, file) => {
        if (file) {
            requestAnimationFrame(() => {
                processor.processImage(file);
            });
        }
    }, 16); // Approximately 60fps

    function updateColors() {
        const color = controls.patternColor.value;
        controls.patternColorPreview.style.backgroundColor = color;
        processor.updateSettings({ color });
        
        debouncedProcessImage(processor, currentFile);
        
        if (activeVideoProcessor) {
            activeVideoProcessor.updateSettings({ color });
        }
    }

    function updateOverlay() {
        const color = controls.overlayColor.value;
        controls.overlayColorPreview.style.backgroundColor = color;
        
        processor.updateSettings({
            overlayColor: color
        });
        
        debouncedProcessImage(processor, currentFile);
        
        if (activeVideoProcessor) {
            activeVideoProcessor.updateSettings({
                overlayColor: color
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
    
    // Export video UI handling
    const videoExportConfig = document.querySelector('.video-export-config');

    // Toggle export video config
    exportVideoBtn.addEventListener('click', (e) => {
        if (!activeVideoProcessor) return;
        videoExportConfig.classList.toggle('show');
    });

    // Theme handling
    themeToggle.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        root.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
        localStorage.setItem('theme', newTheme);
    });

    function updateThemeIcon(theme) {
        sunIcon.style.display = theme === 'light' ? 'none' : 'block';
        moonIcon.style.display = theme === 'light' ? 'block' : 'none';
    }
});