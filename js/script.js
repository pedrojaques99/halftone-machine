class HalftoneProcessor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.settings = {
            dotSize: 5,
            contrast: 100,
            pattern: 'ellipse',
            negative: false,
            brightness: 100
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
        const { dotSize, contrast, pattern, negative, brightness } = this.settings;
        
        // Draw original image
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        
        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        // Clear canvas
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply halftone effect with proper spacing
        const spacing = dotSize * 2;  // Increase spacing based on dot size
        
        for (let y = 0; y < this.canvas.height; y += spacing) {
            for (let x = 0; x < this.canvas.width; x += spacing) {
                const i = (y * this.canvas.width + x) * 4;
                const brightnessValue = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const adjustedBrightness = this.adjustContrast(brightnessValue, contrast);
                const radius = dotSize * (1 - adjustedBrightness / 255);  // Use full dotSize for radius calculation
                
                this.ctx.fillStyle = 'black';
                this.drawPattern(x + spacing/2, y + spacing/2, radius, pattern);  // Center dots in their cells
            }
        }
    }

    drawPattern(x, y, radius, pattern) {
        switch (pattern) {
            case 'ellipse':
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'diamond':
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - radius);
                this.ctx.lineTo(x + radius, y);
                this.ctx.lineTo(x, y + radius);
                this.ctx.lineTo(x - radius, y);
                this.ctx.closePath();
                this.ctx.fill();
                break;
            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(x - radius, y - radius);
                this.ctx.lineTo(x + radius, y + radius);
                this.ctx.lineWidth = radius / 2;
                this.ctx.stroke();
                break;
            case 'letter':
                const letters = ['H', 'A', 'L', 'F'];
                this.ctx.font = `${radius * 2}px monospace`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(letters[Math.floor(Math.random() * letters.length)], x, y);
                break;
        }
    }

    adjustContrast(value, contrast) {
        return Math.min(255, Math.max(0, 
            ((value - 128) * (contrast / 100)) + 128
        ));
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('preview-canvas');
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
        brightness: document.getElementById('brightness'),
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
        if (file && file.type.startsWith('image/')) {
            currentFile = file;
            processor.processImage(file).then(() => {
                exportImageBtn.classList.remove('disabled');
                exportVideoBtn.classList.add('disabled');
            });
        }
    }

    // Control event listeners
    controls.dotSize.addEventListener('input', updateEffect);
    controls.contrast.addEventListener('input', updateEffect);
    controls.brightness.addEventListener('input', updateEffect);
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
        e.target.nextElementSibling.textContent = 
            setting === 'contrast' || setting === 'brightness' ? value + '%' : value;
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
