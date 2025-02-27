class HalftoneProcessor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.effect = new HalftoneEffect(canvas, this.ctx);
        this.settings = {
            dotSize: 8,
            contrast: 100,
            pattern: 'ellipse',
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
    let currentFile = null;

    // Setup controls
    const controls = {
        dotSize: document.getElementById('dot-size'),
        contrast: document.getElementById('contrast'),
        patterns: document.querySelectorAll('input[name="pattern"]'),
        modes: document.querySelectorAll('input[name="mode"]')
    };

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
        
        currentFile = file;
        
        if (file.type.startsWith('image/')) {
            processor.processImage(file).then(() => {
                // Update UI
                exportImageBtn.classList.remove('disabled');
                exportVideoBtn.classList.add('disabled');
            });
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.onloadedmetadata = () => {
                // Set canvas size
                const maxWidth = 800;
                const scale = Math.min(1, maxWidth / video.videoWidth);
                canvas.width = video.videoWidth * scale;
                canvas.height = video.videoHeight * scale;
                
                // Initialize video processor
                const videoProcessor = new VideoProcessor(video, canvas, ctx, processor.settings);
                videoProcessor.halftoneEffect = processor.effect; // Share the same effect instance
                video.play();
                videoProcessor.start();
                
                // Update UI
                exportImageBtn.classList.add('disabled');
                exportVideoBtn.classList.remove('disabled');
            };
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
        });
    });

    controls.modes.forEach(mode => {
        mode.addEventListener('change', (e) => {
            const parentLabel = e.target.closest('.radio-option');
            document.querySelectorAll('input[name="mode"]').forEach(input => {
                input.closest('.radio-option').classList.remove('active');
            });
            parentLabel.classList.add('active');
            processor.updateSettings({ negative: e.target.value === 'negative' });
            if (currentFile) processor.processImage(currentFile);
        });
    });

    function updateEffect(e) {
        const setting = e.target.id.replace('-', '');
        const value = parseInt(e.target.value);
        e.target.nextElementSibling.textContent = setting === 'contrast' ? value + '%' : value;
        processor.updateSettings({ [setting]: value });
        if (currentFile) processor.processImage(currentFile);
    }

    // Export functionality
    exportImageBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'halftone-export.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});