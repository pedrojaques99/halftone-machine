class VideoProcessor {
    constructor(videoElement, canvas, ctx, settings) {
        this.video = videoElement;
        this.canvas = canvas;
        this.ctx = ctx;
        this.settings = {...settings};
        this.halftoneEffect = new HalftoneEffect(canvas, ctx);
        this.halftoneEffect.updateSettings(this.settings);
        this.video.loop = true;
        
        // Frame processing
        this.animationFrame = null;
        this.isProcessing = false;
        this.frameBuffer = document.createElement('canvas');
        this.frameBufferCtx = this.frameBuffer.getContext('2d', { willReadFrequently: true });
        
        // Export settings
        this.exportSettings = {
            format: 'mp4',
            quality: 'medium',
            duration: 10000,
            fps: 30
        };
        
        // Processing settings
        this.processingResolution = {
            width: 1280,
            height: 720
        };
        
        // Recording state
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;

        // Available MIME types
        this.mimeTypes = {
            'mp4': 'video/webm;codecs=h264',
            'webm': 'video/webm;codecs=vp9'
        };

        // Bind methods
        this.renderLoop = this.renderLoop.bind(this);
        
        // Add video event listeners
        this.video.addEventListener('play', () => {
            this.start();
        });
        
        this.video.addEventListener('pause', () => {
            this.stop();
        });

        // Add canvas event listeners with passive: false
        this.canvas.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });

        // Prevent default touch actions
        this.canvas.style.touchAction = 'none';
        this.canvas.style.userSelect = 'none';
        this.canvas.style.webkitUserSelect = 'none';
        this.canvas.style.webkitTouchCallout = 'none';
    }
    
    start() {
        if (this.isProcessing) return;
        
        // Set initial canvas size
        const videoAspect = this.video.videoWidth / this.video.videoHeight;
        const targetWidth = Math.min(this.processingResolution.width, window.innerWidth * 0.8);
        const targetHeight = targetWidth / videoAspect;
        
        this.canvas.width = targetWidth;
        this.canvas.height = targetHeight;
        this.frameBuffer.width = targetWidth;
        this.frameBuffer.height = targetHeight;
        
        this.isProcessing = true;
        this.renderLoop();
    }
    
    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.isProcessing = false;
        
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
    }
    
    renderLoop() {
        if (!this.isProcessing || this.video.paused || this.video.ended) {
            return;
        }

        // Clear the frame buffer
        this.frameBufferCtx.clearRect(0, 0, this.frameBuffer.width, this.frameBuffer.height);
        
        // Draw the video frame to the buffer
        this.frameBufferCtx.drawImage(this.video, 0, 0, this.frameBuffer.width, this.frameBuffer.height);
        
        // Clear the main canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Process with halftone effect using the buffer
        this.halftoneEffect.process(this.frameBuffer);
        
        // Request next frame
        this.animationFrame = requestAnimationFrame(this.renderLoop);
    }

    updateSettings(newSettings) {
        this.settings = {...this.settings, ...newSettings};
        this.halftoneEffect.updateSettings(this.settings);
    }

    updateExportSettings(settings) {
        this.exportSettings = {...this.exportSettings, ...settings};
    }

    setProcessingResolution(width, height) {
        this.processingResolution.width = width;
        this.processingResolution.height = height;
        
        if (this.video.videoWidth) {
            const videoAspect = this.video.videoWidth / this.video.videoHeight;
            const targetWidth = Math.min(width, window.innerWidth * 0.8);
            const targetHeight = targetWidth / videoAspect;
            
            this.canvas.width = targetWidth;
            this.canvas.height = targetHeight;
        }
    }

    startRecording() {
        if (this.isRecording) return;
        
        const stream = this.canvas.captureStream(this.exportSettings.fps);
        const options = {
            mimeType: this.mimeTypes[this.exportSettings.format],
            videoBitsPerSecond: this._getBitrate()
        };

        this.mediaRecorder = new MediaRecorder(stream, options);
        this.recordedChunks = [];

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                this.recordedChunks.push(e.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            this.isRecording = false;
            const blob = new Blob(this.recordedChunks, {
                type: this.mimeTypes[this.exportSettings.format]
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `halftone-video.${this.exportSettings.format}`;
            a.click();
            URL.revokeObjectURL(url);
        };

        this.mediaRecorder.start();
        this.isRecording = true;

        setTimeout(() => {
            if (this.mediaRecorder && this.isRecording) {
                this.mediaRecorder.stop();
            }
        }, this.exportSettings.duration);

        return this.exportSettings.duration;
    }

    _getBitrate() {
        const qualityMultipliers = {
            low: 1000000,    // 1 Mbps
            medium: 2500000, // 2.5 Mbps
            high: 5000000    // 5 Mbps
        };
        return qualityMultipliers[this.exportSettings.quality] || qualityMultipliers.medium;
    }
}