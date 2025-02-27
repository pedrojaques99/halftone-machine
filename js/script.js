class HalftoneProcessor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
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
        this.applyHalftoneEffect(img);
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

    applyHalftoneEffect(img) {
        const { dotSize, contrast, pattern, negative } = this.settings;
        
        // Draw original image
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        
        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        // Clear canvas
        this.ctx.fillStyle = negative ? 'black' : 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set drawing color
        this.ctx.fillStyle = negative ? 'white' : 'black';
        this.ctx.strokeStyle = negative ? 'white' : 'black';
        
        const spacing = dotSize * 2;
        
        for (let y = 0; y < this.canvas.height; y += spacing) {
            for (let x = 0; x < this.canvas.width; x += spacing) {
                // Sample area for brightness
                let sum = 0;
                let count = 0;
                
                for (let sy = 0; sy < spacing; sy++) {
                    for (let sx = 0; sx < spacing; sx++) {
                        const idx = ((y + sy) * this.canvas.width + (x + sx)) * 4;
                        if (idx < data.length) {
                            sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                            count++;
                        }
                    }
                }
                
                const brightness = count > 0 ? sum / count : 0;
                const adjustedBrightness = this.adjustContrast(brightness, contrast);
                const size = dotSize * (negative ? adjustedBrightness : (255 - adjustedBrightness)) / 255;
                
                if (size > 0.5) {
                    this.drawPattern(
                        x + spacing/2, 
                        y + spacing/2, 
                        size, 
                        pattern
                    );
                }
            }
        }
    }

    drawPattern(x, y, size, pattern) {
        switch (pattern) {
            case 'ellipse':
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
                break;
                
            case 'diamond':
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - size);
                this.ctx.lineTo(x + size, y);
                this.ctx.lineTo(x, y + size);
                this.ctx.lineTo(x - size, y);
                this.ctx.closePath();
                this.ctx.fill();
                break;
                
            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvas.width, y);
                this.ctx.lineWidth = size;
                this.ctx.stroke();
                break;
                
            case 'letter':
                if (size > 2) {
                    const chars = '@#%&WM8BOSo=+i-.:`';
                    const index = Math.floor((chars.length - 1) * (size / this.settings.dotSize));
                    this.ctx.font = `${size * 1.5}px monospace`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(chars[index], x, y);
                }
                break;
        }
    }

    adjustContrast(value, contrast) {
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        return Math.min(255, Math.max(0, factor * (value - 128) + 128));
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('preview-canvas');
    const ctx = canvas.getContext('2d');
    const effect = new HalftoneEffect(canvas, ctx);
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
            const img = new Image();
            img.onload = () => {
                // Set canvas size
                const maxWidth = 800;
                const scale = Math.min(1, maxWidth / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                // Process image
                effect.process(img);
                
                // Update UI
                exportImageBtn.classList.remove('disabled');
                exportVideoBtn.classList.add('disabled');
            };
            img.src = URL.createObjectURL(file);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.onloadedmetadata = () => {
                // Set canvas size
                const maxWidth = 800;
                const scale = Math.min(1, maxWidth / video.videoWidth);
                canvas.width = video.videoWidth * scale;
                canvas.height = video.videoHeight * scale;
                
                // Initialize video processor with same effect instance
                const videoProcessor = new VideoProcessor(video, canvas, ctx, effect);
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
