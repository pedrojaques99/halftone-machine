class VideoProcessor {
    constructor(videoElement, canvas, ctx, settings) {
        this.video = videoElement;
        this.canvas = canvas;
        this.ctx = ctx;
        this.settings = {...settings};
        this.animationFrame = null;
        this.halftoneEffect = new HalftoneEffect(canvas, ctx);
        this.halftoneEffect.updateSettings(this.settings);
        this.video.loop = true;
        
        // Export settings
        this.exportSettings = {
            format: 'mp4',
            quality: 'medium',
            duration: 10000, // 10 seconds max by default
            fps: 30
        };
        
        // Processing settings
        this.processingResolution = {
            width: 1280,
            height: 720
        };
        this.lastFrameTime = 0;
        this.frameInterval = 1000 / this.exportSettings.fps;
        
        // Recording state
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;

        // Available MIME types
        this.mimeTypes = {
            'mp4': 'video/webm;codecs=h264', // We'll convert WebM to MP4 later
            'webm': 'video/webm;codecs=vp9'
        };
    }
    
    start() {
        this.processFrame();
    }
    
    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.cleanup();
    }
    
    cleanup() {
        this.stopRecording();
        this.recordedChunks = [];
        if (this.video.src) {
            URL.revokeObjectURL(this.video.src);
        }
    }
    
    updateSettings(newSettings) {
        this.settings = {...this.settings, ...newSettings};
        this.halftoneEffect.updateSettings(newSettings);
    }
    
    updateExportSettings(settings) {
        this.exportSettings = {...this.exportSettings, ...settings};
        this.frameInterval = 1000 / this.exportSettings.fps;
    }
    
    processFrame() {
        if (this.video.paused || this.video.ended) return;
        
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastFrameTime;
        
        if (elapsed < this.frameInterval) {
            this.animationFrame = requestAnimationFrame(() => this.processFrame());
            return;
        }
        
        this.lastFrameTime = currentTime - (elapsed % this.frameInterval);
        
        const dims = this.setupVideoCanvas(this.video);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.video, dims.x, dims.y, dims.width, dims.height);
        this.halftoneEffect.process();
        
        this.animationFrame = requestAnimationFrame(() => this.processFrame());
    }
    
    startRecording() {
        if (this.isRecording) return;
        
        this.isRecording = true;
        this.recordedChunks = [];
        
        const stream = this.canvas.captureStream(this.exportSettings.fps);
        
        // Always use WebM for recording (most widely supported)
        const mimeType = 'video/webm;codecs=vp9';
        const bitrate = this.getBitrateForQuality(this.exportSettings.quality);
        
        try {
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: bitrate
            });
        } catch (error) {
            console.error('MediaRecorder error:', error);
            this.isRecording = false;
            throw new Error('Failed to create MediaRecorder. Your browser might not support video recording.');
        }
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            this.isRecording = false;
            this.exportVideo();
        };
        
        this.mediaRecorder.onerror = (error) => {
            console.error('Recording error:', error);
            this.isRecording = false;
            this.cleanup();
        };
        
        this.video.currentTime = 0;
        this.video.play();
        
        this.mediaRecorder.start(100);
        
        const duration = Math.min(
            this.exportSettings.duration,
            this.video.duration ? this.video.duration * 1000 : this.exportSettings.duration
        );
        
        setTimeout(() => this.stopRecording(), duration);
        
        return duration;
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }
    
    getBitrateForQuality(quality) {
        const bitrates = {
            low: 2500000,    // 2.5 Mbps
            medium: 5000000, // 5 Mbps
            high: 8000000    // 8 Mbps
        };
        return bitrates[quality] || bitrates.medium;
    }
    
    exportVideo() {
        if (this.recordedChunks.length === 0) return;
        
        // Always create as WebM first
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        // Set the extension based on format setting
        const extension = this.exportSettings.format === 'mp4' ? 'mp4' : 'webm';
        a.download = `halftone-video.${extension}`;
        a.href = url;
        a.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    
    setupVideoCanvas(video) {
        const { width, height } = this.processingResolution;
        this.canvas.width = width;
        this.canvas.height = height;
        
        const scale = Math.min(
            width / video.videoWidth,
            height / video.videoHeight
        );
        
        const scaledWidth = video.videoWidth * scale;
        const scaledHeight = video.videoHeight * scale;
        
        const x = (width - scaledWidth) / 2;
        const y = (height - scaledHeight) / 2;
        
        return { x, y, width: scaledWidth, height: scaledHeight };
    }
    
    setProcessingResolution(width, height) {
        this.processingResolution = { width, height };
        this.setupVideoCanvas(this.video);
    }
    
    setTargetFPS(fps) {
        this.exportSettings.fps = fps;
        this.frameInterval = 1000 / fps;
    }
}