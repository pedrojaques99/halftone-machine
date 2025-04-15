// UI Elements
const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');
const processor = new HalftoneProcessor(canvas);
const dropZone = document.getElementById('upload-container');
const fileInput = document.getElementById('file-input');
const exportImageBtn = document.getElementById('export-image');
const exportVideoBtn = document.getElementById('export-video');
const loadingIndicator = document.querySelector('.loading-indicator');
const videoControls = document.querySelector('.video-controls');
const tutorialOverlay = document.querySelector('#upload-tutorial');
const tutorialFileInput = document.querySelector('#tutorial-file-input');

let currentFile = null;
let activeVideoProcessor = null;

// Controls
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

// Initialize theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    root.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// File handling
function initializeFileHandling() {
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
}

// Tutorial area handling
function initializeTutorialArea() {
    tutorialOverlay.addEventListener('click', () => {
        tutorialFileInput.click();
    });

    tutorialFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    });

    tutorialOverlay.addEventListener('dragover', (e) => {
        e.preventDefault();
        tutorialOverlay.classList.add('drag-over');
    });

    tutorialOverlay.addEventListener('dragleave', () => {
        tutorialOverlay.classList.remove('drag-over');
    });

    tutorialOverlay.addEventListener('drop', (e) => {
        e.preventDefault();
        tutorialOverlay.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    });
}

// File processing
function handleFile(file) {
    if (!file) return;
    
    if (activeVideoProcessor) {
        activeVideoProcessor.stop();
        activeVideoProcessor = null;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    loadingIndicator.style.display = 'block';
    currentFile = file;
    
    tutorialOverlay.classList.add('hidden');
    document.querySelector('.video-export-config').classList.remove('show');
    
    if (file.type.startsWith('image/')) {
        handleImageFile(file);
    } else if (file.type.startsWith('video/')) {
        handleVideoFile(file);
    } else {
        alert('Please upload an image or video file.');
        loadingIndicator.style.display = 'none';
        tutorialOverlay.classList.remove('hidden');
    }
}

function handleImageFile(file) {
    processor.processImage(file).then(() => {
        loadingIndicator.style.display = 'none';
        exportImageBtn.classList.remove('disabled');
        exportVideoBtn.classList.add('disabled');
    }).catch(error => {
        console.error('Error processing image:', error);
        loadingIndicator.style.display = 'none';
        tutorialOverlay.classList.remove('hidden');
    });
}

function handleVideoFile(file) {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.loop = true;
    
    video.onloadedmetadata = () => {
        const videoProcessor = new VideoProcessor(video, canvas, ctx, processor.settings);
        videoProcessor.halftoneEffect = processor.effect;
        
        updateVideoSettings(videoProcessor);
        
        activeVideoProcessor = videoProcessor;
        video.play();
        videoProcessor.start();
        
        loadingIndicator.style.display = 'none';
        exportImageBtn.classList.add('disabled');
        exportVideoBtn.classList.remove('disabled');
    };
    
    video.onerror = () => {
        console.error('Error loading video');
        loadingIndicator.style.display = 'none';
        tutorialOverlay.classList.remove('hidden');
    };
}

// Effect controls
function initializeEffectControls() {
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
}

// Video controls
function initializeVideoControls() {
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

    controls.videoBitrate.forEach(bitrate => {
        bitrate.addEventListener('change', (e) => {
            const parentLabel = e.target.closest('.radio-option');
            const dropdownLabel = e.target.closest('.control-group').querySelector('.dropdown-label span');
            const qualityText = e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1);
            
            dropdownLabel.textContent = `Quality: ${qualityText}`;
            
            e.target.closest('.radio-group').querySelectorAll('.radio-option').forEach(opt => {
                opt.classList.remove('active');
            });
            parentLabel.classList.add('active');
            
            if (activeVideoProcessor) {
                activeVideoProcessor.updateExportSettings({ bitrate: e.target.value });
            }
        });
    });
}

// Utility functions
function updateVideoSettings(videoProcessor) {
    const formatInput = document.querySelector('input[name="video-format"]:checked');
    if (formatInput) {
        videoProcessor.updateExportSettings({ format: formatInput.value });
    }

    const qualityInput = document.querySelector('input[name="video-quality"]:checked');
    if (qualityInput) {
        const quality = qualityInput.value;
        videoProcessor.updateExportSettings({ quality });
        switch (quality) {
            case 'low':
                videoProcessor.setProcessingResolution(854, 480);
                break;
            case 'medium':
                videoProcessor.setProcessingResolution(1280, 720);
                break;
            case 'high':
                videoProcessor.setProcessingResolution(1920, 1080);
                break;
        }
    }

    const bitrateInput = document.querySelector('input[name="video-bitrate"]:checked');
    if (bitrateInput) {
        videoProcessor.updateExportSettings({ bitrate: bitrateInput.value });
    }

    const fpsInput = document.querySelector('input[name="video-fps"]:checked');
    if (fpsInput) {
        videoProcessor.updateExportSettings({ fps: parseInt(fpsInput.value) });
    }
}

function updateEffect(e) {
    const setting = e.target.id.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
    let value = parseInt(e.target.value);
    
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
}, 16);

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
function initializeExport() {
    exportImageBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'halftone-export.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
    
    const videoExportConfig = document.querySelector('.video-export-config');
    
    exportVideoBtn.addEventListener('click', (e) => {
        if (!activeVideoProcessor) return;
        videoExportConfig.classList.toggle('show');
        exportVideoBtn.classList.toggle('active');
    });
}

// Theme handling
function initializeTheme() {
    themeToggle.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        root.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

function updateThemeIcon(theme) {
    sunIcon.style.display = theme === 'light' ? 'none' : 'block';
    moonIcon.style.display = theme === 'light' ? 'block' : 'none';
}

// Recording functionality
function initializeRecording() {
    const startExportBtn = document.querySelector('.start-export-btn');
    const recordingStatus = document.querySelector('.recording-status');
    const recordingTime = recordingStatus.querySelector('.time');
    let recordingTimer = null;

    startExportBtn.addEventListener('click', () => {
        if (activeVideoProcessor) {
            try {
                const recordingDuration = activeVideoProcessor.startRecording();
                const startTime = Date.now();
                
                startExportBtn.textContent = 'Recording...';
                startExportBtn.classList.add('recording');
                recordingStatus.classList.add('active');
                
                recordingTimer = setInterval(() => updateRecordingTime(startTime), 1000);
                
                setTimeout(() => {
                    startExportBtn.textContent = 'Start Recording';
                    startExportBtn.classList.remove('recording');
                    recordingStatus.classList.remove('active');
                    clearInterval(recordingTimer);
                    recordingTime.textContent = '00:00';
                }, recordingDuration + 500);
            } catch (error) {
                console.error('Export error:', error);
                alert('Video recording failed. Your browser might not support this feature. Please try using a modern version of Chrome or Firefox.');
                startExportBtn.textContent = 'Start Recording';
                startExportBtn.classList.remove('recording');
                recordingStatus.classList.remove('active');
                if (recordingTimer) {
                    clearInterval(recordingTimer);
                }
                recordingTime.textContent = '00:00';
            }
        }
    });
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateRecordingTime(startTime) {
    const elapsed = Date.now() - startTime;
    document.querySelector('.recording-status .time').textContent = formatTime(elapsed);
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    initializeFileHandling();
    initializeTutorialArea();
    initializeEffectControls();
    initializeVideoControls();
    initializeExport();
    initializeTheme();
    initializeRecording();
});