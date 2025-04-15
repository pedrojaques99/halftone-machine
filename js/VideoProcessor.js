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
        this.frameCallback = null;
        this.isProcessing = false;
        this.lastFrameTime = 0;
        
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
        this._processFrame = this._processFrame.bind(this);
        
        // Add video event listeners
        this.video.addEventListener('play', () => {
            this.start();
        });
        
        this.video.addEventListener('pause', () => {
            this.stop();
        });

        // Add canvas event listeners
        this.canvas.addEventListener('click', (e) => {
            // Prevent default to avoid any browser handling
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });
    }
    
    start() {
        if (this.isProcessing) return;
        
        // Set initial canvas size
        const videoAspect = this.video.videoWidth / this.video.videoHeight;
        const targetWidth = Math.min(this.processingResolution.width, window.innerWidth * 0.8);
        const targetHeight = targetWidth / videoAspect;
        
        this.canvas.width = targetWidth;
        this.canvas.height = targetHeight;
        
        // Set canvas style to prevent any browser default handling
        this.canvas.style.touchAction = 'none';
        this.canvas.style.userSelect = 'none';
        this.canvas.style.webkitUserSelect = 'none';
        
        this.isProcessing = true;
        this._processFrame();
    }
    
    stop() {
        if (this.frameCallback) {
            this.video.cancelVideoFrameCallback(this.frameCallback);
            this.frameCallback = null;
        }
        this.isProcessing = false;
        
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
    }
    
    _processFrame() {
        if (!this.isProcessing || this.video.paused || this.video.ended) {
            return;
        }

        const currentTime = performance.now();
        const timeSinceLastFrame = currentTime - this.lastFrameTime;
        
        // Only process if enough time has passed (helps prevent flickering)
        if (timeSinceLastFrame < 16) { // ~60fps
            this.frameCallback = this.video.requestVideoFrameCallback(this._processFrame);
            return;
        }

        // Clear the canvas with a single operation
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw the video frame
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Process with halftone effect
        this.halftoneEffect.process(this.video);
        
        this.lastFrameTime = currentTime;
        
        // Request next frame using video frame callback
        this.frameCallback = this.video.requestVideoFrameCallback(this._processFrame);
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