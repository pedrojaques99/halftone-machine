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
        const maxWidth = 1200;
        const maxHeight = 1200;
        
        // Calculate scale based on both width and height constraints
        const widthScale = maxWidth / img.width;
        const heightScale = maxHeight / img.height;
        const scale = Math.min(1, Math.min(widthScale, heightScale));
        
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