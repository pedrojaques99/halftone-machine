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
        
        // For video export
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
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
        this.settings = {...this.settings, ...newSettings};
        this.halftoneEffect.updateSettings(newSettings);
    }
    
    processFrame() {
        if (this.video.paused || this.video.ended) return;
        
        // Get scaled dimensions
        const dims = this.setupVideoCanvas(this.video);
        
        // Clear and draw video frame
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.video, dims.x, dims.y, dims.width, dims.height);
        
        // Apply halftone effect
        this.halftoneEffect.process();
        
        // Continue animation loop
        this.animationFrame = requestAnimationFrame(() => this.processFrame());
    }
    
    startRecording(duration = 5000) {
        if (this.isRecording) return;
        
        this.isRecording = true;
        this.recordedChunks = [];
        
        // Create a high quality stream from the canvas
        const stream = this.canvas.captureStream(60); // 60 FPS
        
        // Setup media recorder with high quality settings
        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 8000000 // 8 Mbps for high quality
        });
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            this.isRecording = false;
            this.exportVideo();
        };
        
        // Start the recorder
        this.mediaRecorder.start(100); // Collect data in 100ms chunks
        
        // Rewind and play the video from the beginning
        this.video.currentTime = 0;
        this.video.play();
        
        // Stop recording after specified duration or video duration
        const recordingDuration = Math.min(
            duration, 
            this.video.duration ? this.video.duration * 1000 : duration
        );
        
        setTimeout(() => {
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
        }, recordingDuration);
        
        return recordingDuration;
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }
    
    exportVideo() {
        if (this.recordedChunks.length === 0) return;
        
        // Create a blob from the recorded chunks
        const blob = new Blob(this.recordedChunks, { type: 'video/mp4' });
        
        // Create a link element to download the video
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'halftone-video.mp4';
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
    
    // Update canvas size for video processing
    setupVideoCanvas(video) {
        // Set canvas to 1080p resolution
        this.canvas.width = 1920;
        this.canvas.height = 1080;
        
        // Scale video to fit while maintaining aspect ratio
        const scale = Math.max(
            this.canvas.width / video.videoWidth,
            this.canvas.height / video.videoHeight
        );
        
        const scaledWidth = video.videoWidth * scale;
        const scaledHeight = video.videoHeight * scale;
        
        // Center the video
        const x = (this.canvas.width - scaledWidth) / 2;
        const y = (this.canvas.height - scaledHeight) / 2;
        
        return { x, y, width: scaledWidth, height: scaledHeight };
    }
}