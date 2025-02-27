class HalftoneEffect {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.settings = {
            dotSize: 8,
            contrast: 100,
            pattern: 'ellipse',
            negative: false,
            brightness: 100  // Add brightness control
        };
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
    }

    updateSettings(newSettings) {
        this.settings = {...this.settings, ...newSettings};
    }

    process() {
        this.setupTempCanvas();
        this.convertToGrayscale();
        this.applyHalftonePattern();
    }

    setupTempCanvas() {
        this.tempCanvas.width = this.canvas.width;
        this.tempCanvas.height = this.canvas.height;
        this.tempCtx.drawImage(this.canvas, 0, 0);
    }

    convertToGrayscale() {
        const imageData = this.tempCtx.getImageData(0, 0, this.tempCanvas.width, this.tempCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert to grayscale
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Apply brightness
            gray = gray * (this.settings.brightness / 100);
            
            // Apply contrast
            const factor = (259 * (this.settings.contrast + 255)) / (255 * (259 - this.settings.contrast));
            gray = factor * (gray - 128) + 128;
            gray = Math.max(0, Math.min(255, gray));
            
            data[i] = data[i + 1] = data[i + 2] = gray;
        }

        this.tempCtx.putImageData(imageData, 0, 0);
    }

    applyHalftonePattern() {
        // Clear the main canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const dotSize = this.settings.dotSize;
        const spacing = dotSize * 2;

        for (let y = 0; y < this.canvas.height; y += spacing) {
            for (let x = 0; x < this.canvas.width; x += spacing) {
                const value = this.sampleRegion(x, y, spacing);
                const normalizedValue = 1 - (value / 255);
                this.drawPattern(x, y, normalizedValue);
            }
        }
    }

    sampleRegion(x, y, size) {
        const data = this.tempCtx.getImageData(
            Math.max(0, x - size/2),
            Math.max(0, y - size/2),
            Math.min(size, this.canvas.width - x + size/2),
            Math.min(size, this.canvas.height - y + size/2)
        ).data;

        let sum = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
            sum += data[i];
            count++;
        }

        return count > 0 ? sum / count : 0;
    }

    drawPattern(x, y, value) {
        const dotSize = this.settings.dotSize;
        // Invert value if negative is true
        value = this.settings.negative ? 1 - value : value;
        this.ctx.fillStyle = 'black';

        switch (this.settings.pattern) {
            case 'ellipse':
                this.ctx.beginPath();
                this.ctx.ellipse(x, y, dotSize * value, dotSize * value, 0, 0, Math.PI * 2);
                this.ctx.fill();
                break;

            case 'diamond':
                const size = dotSize * value * 1.5;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - size);
                this.ctx.lineTo(x + size, y);
                this.ctx.lineTo(x, y + size);
                this.ctx.lineTo(x - size, y);
                this.ctx.closePath();
                this.ctx.fill();
                break;

            case 'line':
                const lineWidth = dotSize * value;
                this.ctx.beginPath();
                // Extend lines to canvas edges
                this.ctx.moveTo(0, y - this.canvas.height);
                this.ctx.lineTo(this.canvas.width, y + this.canvas.height);
                this.ctx.lineWidth = lineWidth;
                this.ctx.stroke();
                break;

            case 'letter':
                if (value > 0.1) {
                    const fontSize = Math.max(8, dotSize * 2);
                    this.ctx.font = `${fontSize}px monospace`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    
                    // Expanded character set based on density
                    const chars = {
                        dark: '@#%&WM',
                        medium: '8B0O$S',
                        light: '*o=+i-',
                        veryLight: '.:,\'`'
                    };
                    
                    let char;
                    if (value > 0.8) {
                        char = chars.dark[Math.floor(Math.random() * chars.dark.length)];
                    } else if (value > 0.5) {
                        char = chars.medium[Math.floor(Math.random() * chars.medium.length)];
                    } else if (value > 0.3) {
                        char = chars.light[Math.floor(Math.random() * chars.light.length)];
                    } else {
                        char = chars.veryLight[Math.floor(Math.random() * chars.veryLight.length)];
                    }
                    
                    this.ctx.fillText(char, x, y);
                }
                break;
        }
    }
} 