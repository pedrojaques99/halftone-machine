class HalftoneEffect {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.settings = {
            dotSize: 8,
            contrast: 100,
            pattern: 'elipse',
            negative: false,
            color: '#000000',
            secondaryColor: '#666666',
            overlayColor: '#ffffff',
            overlayOpacity: 0
        };
        
        // Cache for performance
        this._contrastFactor = this.calculateContrastFactor();
    }

    updateSettings(newSettings) {
        this.settings = {...this.settings, ...newSettings};
        if ('contrast' in newSettings) {
            this._contrastFactor = this.calculateContrastFactor();
        }
    }

    process(img) {
        if (img) {
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        }
        
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        // Clear canvas with background color
        this.ctx.fillStyle = this.settings.negative ? 'black' : 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set drawing color
        this.ctx.fillStyle = this.settings.negative ? 'white' : this.settings.color;
        this.ctx.strokeStyle = this.ctx.fillStyle;
        
        // Calculate pattern spacing
        const spacing = this.getPatternSpacing();
        
        // Calculate grid alignment to ensure patterns line up
        const startX = spacing / 2;
        const startY = spacing / 2;
        const cols = Math.ceil(this.canvas.width / spacing);
        const rows = Math.ceil(this.canvas.height / spacing);
        
        // Process the entire image in a grid-aligned pattern
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = startX + col * spacing;
                const y = startY + row * spacing;
                
                // Sample and draw pattern
                const brightness = this.sampleArea(x - spacing/2, y - spacing/2, spacing, data);
                const adjustedBrightness = this.adjustContrast(brightness);
                const size = this.settings.dotSize * 
                    (this.settings.negative ? adjustedBrightness : (255 - adjustedBrightness)) / 255;
                
                if (size > 0.5 || this.settings.pattern === 'line') {
                    this.drawPattern(x, y, size);
                }
            }
        }

        // Apply overlay if needed
        if (this.settings.overlayOpacity > 0) {
            this.applyOverlay();
        }
    }

    sampleArea(x, y, spacing, data) {
        let sum = 0;
        let count = 0;
        
        // Ensure we don't sample outside the image bounds
        const startX = Math.max(0, Math.floor(x));
        const startY = Math.max(0, Math.floor(y));
        const endX = Math.min(this.canvas.width, Math.ceil(x + spacing));
        const endY = Math.min(this.canvas.height, Math.ceil(y + spacing));
        
        for (let sy = startY; sy < endY; sy++) {
            for (let sx = startX; sx < endX; sx++) {
                const idx = (sy * this.canvas.width + sx) * 4;
                if (idx < data.length) {
                    // Use proper RGB weighting for luminance
                    sum += (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
                    count++;
                }
            }
        }
        
        return count > 0 ? sum / count : 0;
    }

    getPatternSpacing() {
        // Adjust spacing based on pattern type for better visual consistency
        const baseSpacing = this.settings.dotSize * 2;
        switch (this.settings.pattern) {
            case 'line':
                return this.settings.dotSize;
            case 'pixel':
                return this.settings.dotSize * 1.5;
            case 'stochastic':
                return this.settings.dotSize * 1.75;
            case 'crt':
                return this.settings.dotSize * 2.5;
            default:
                return baseSpacing;
        }
    }

    calculateContrastFactor() {
        return (259 * (this.settings.contrast + 255)) / (255 * (259 - this.settings.contrast));
    }

    adjustContrast(value) {
        return Math.min(255, Math.max(0, this._contrastFactor * (value - 128) + 128));
    }

    drawPattern(x, y, size) {
        switch (this.settings.pattern) {
            case 'elipse':
            case 'diamond':
            case 'x':
            case 'star':
            case 'pixel':
            case 'letter':
            case 'stochastic':
                this.ctx.fillStyle = this.settings.negative ? 
                    'white' : this.settings.color;
                this.ctx.strokeStyle = this.ctx.fillStyle;
                break;
                
            case 'crt':
                const color1 = this.hexToRgb(this.settings.color);
                const color2 = this.hexToRgb(this.settings.secondaryColor);
                const luminance = (0.299 * color1.r + 0.587 * color1.g + 0.114 * color1.b) / 255;
                const opacity = size / this.settings.dotSize * (1 + luminance) / 2;
                
                this.ctx.fillStyle = `rgba(${color1.r}, 0, 0, ${opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(x - size * 0.4 - size * 0.2, y, size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.fillStyle = `rgba(0, ${color2.g}, 0, ${opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.fillStyle = `rgba(0, 0, ${color1.b}, ${opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(x + size * 0.4 + size * 0.2, y, size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.fillStyle = this.settings.negative ? 'white' : 'black';
                break;
        }
        
        switch (this.settings.pattern) {
            case 'elipse':
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
                const spikes = 4;
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
                    const chars = 'ABC1023456789!@#%&WM8BOSo=+i-.:`';
                    const index = Math.floor((chars.length - 1) * (size / this.settings.dotSize));
                    this.ctx.font = `${size * 2}px monospace`;
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

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    applyOverlay() {
        const opacity = this.settings.overlayOpacity / 100;
        this.ctx.save();
        
        // Use multiply blend mode
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.globalAlpha = opacity;
        this.ctx.fillStyle = this.settings.overlayColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add a white layer with screen blend mode to handle brightness
        if (opacity > 0) {
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.globalAlpha = 1 - opacity;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        this.ctx.restore();
    }
} 