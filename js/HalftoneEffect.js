class HalftoneEffect {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.settings = {
            dotSize: 8,
            contrast: 100,
            pattern: 'ellipse',
            negative: false
        };
    }

    updateSettings(newSettings) {
        this.settings = {...this.settings, ...newSettings};
    }

    process(img) {
        if (img) {
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        }
        
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        // Clear canvas
        this.ctx.fillStyle = this.settings.negative ? 'black' : 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set drawing color
        this.ctx.fillStyle = this.settings.negative ? 'white' : 'black';
        this.ctx.strokeStyle = this.ctx.fillStyle;
        
        // Use smaller spacing for lines pattern
        const spacing = this.settings.pattern === 'line' ? 
            this.settings.dotSize : 
            this.settings.dotSize * 2;
        
        for (let y = 0; y < this.canvas.height; y += spacing) {
            for (let x = 0; x < this.canvas.width; x += spacing) {
                // Sample area brightness
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
                const adjustedBrightness = this.adjustContrast(brightness);
                const size = this.settings.dotSize * 
                    (this.settings.negative ? adjustedBrightness : (255 - adjustedBrightness)) / 255;
                
                if (size > 0.5 || this.settings.pattern === 'line') {
                    this.drawPattern(x + spacing/2, y + spacing/2, size);
                }
            }
        }
    }

    drawPattern(x, y, size) {
        switch (this.settings.pattern) {
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
                
            case 'x':
                // X pattern (formerly CRM)
                const lineWidth = Math.max(0.5, size * 0.15);
                this.ctx.lineWidth = lineWidth;
                
                this.ctx.beginPath();
                this.ctx.moveTo(x - size, y - size);
                this.ctx.lineTo(x + size, y + size);
                this.ctx.moveTo(x + size, y - size);
                this.ctx.lineTo(x - size, y + size);
                this.ctx.stroke();
                break;
                
            case 'star':
                // Draw a 5-pointed star
                const spikes = 5;
                const outerRadius = size;
                const innerRadius = size * 0.4;
                
                this.ctx.beginPath();
                for (let i = 0; i < spikes * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (i * Math.PI) / spikes;
                    const pointX = x + Math.cos(angle) * radius;
                    const pointY = y + Math.sin(angle) * radius;
                    
                    if (i === 0) {
                        this.ctx.moveTo(pointX, pointY);
                    } else {
                        this.ctx.lineTo(pointX, pointY);
                    }
                }
                this.ctx.closePath();
                this.ctx.fill();
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
            
            case 'stochastic':
                // Stochastic pattern - random dots based on density
                const dotCount = Math.floor(size * 3); // Number of dots based on size
                const radius = Math.max(0.5, this.settings.dotSize * 0.2); // Small fixed radius
                
                for (let i = 0; i < dotCount; i++) {
                    const offsetX = (Math.random() - 0.5) * this.settings.dotSize * 2;
                    const offsetY = (Math.random() - 0.5) * this.settings.dotSize * 2;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                break;
            
            case 'crt':
                // CRT monitor effect with RGB subpixels
                const rgbSize = size * 0.4;
                const gap = rgbSize * 0.2;
                
                // Red subpixel
                this.ctx.fillStyle = `rgba(255, 0, 0, ${size / this.settings.dotSize})`;
                this.ctx.beginPath();
                this.ctx.arc(x - rgbSize - gap, y, rgbSize, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Green subpixel
                this.ctx.fillStyle = `rgba(0, 255, 0, ${size / this.settings.dotSize})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, rgbSize, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Blue subpixel
                this.ctx.fillStyle = `rgba(0, 0, 255, ${size / this.settings.dotSize})`;
                this.ctx.beginPath();
                this.ctx.arc(x + rgbSize + gap, y, rgbSize, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Reset fill style
                this.ctx.fillStyle = this.settings.negative ? 'white' : 'black';
                break;
            
            case 'pixel':
                // Simple pixelation effect
                const pixelSize = Math.max(1, size);
                this.ctx.fillRect(
                    x - pixelSize/2,
                    y - pixelSize/2,
                    pixelSize,
                    pixelSize
                );
                break;
        }
    }

    adjustContrast(value) {
        const factor = (259 * (this.settings.contrast + 255)) / (255 * (259 - this.settings.contrast));
        return Math.min(255, Math.max(0, factor * (value - 128) + 128));
    }
} 