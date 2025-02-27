class VideoProcessor {
    constructor(videoElement, canvas, ctx, settings) {
        this.video = videoElement;
        this.canvas = canvas;
        this.ctx = ctx;
        this.settings = {...settings};
        this.animationFrame = null;
        this.halftoneEffect = new HalftoneEffect(canvas, ctx);
    }
    
    start() {
        this.processFrame();
    }
    
    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    updateSettings(newSettings) {
        this.settings = {...newSettings};
        this.halftoneEffect.updateSettings(newSettings);
    }
    
    processFrame() {
        if (this.video.paused || this.video.ended) return;
        
        // Draw the current video frame
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Apply halftone effect
        this.halftoneEffect.process();
        
        // Continue animation loop
        this.animationFrame = requestAnimationFrame(() => this.processFrame());
    }
} 