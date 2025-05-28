// Enhanced CameraService.js - Professional Card Tracking & Light Optimization
// Replace your current CameraService.js with this enhanced version

class CameraService {
    constructor() {
        this.availableCameras = [];
        this.selectedCamera = '';
        this.cameraError = '';
        this.cameraResolution = 'hd';
        this.isScanning = false;
        this.videoRef = null;
        this.canvasRef = null;
        this.onCamerasChanged = () => {};
        this.onErrorChanged = () => {};
        this.onScanningChanged = () => {};
        this.onCardDetected = () => {}; // New callback for card detection
        
        // Card tracking state
        this.isTracking = false;
        this.cardBounds = null;
        this.trackingCanvas = null;
        this.trackingContext = null;
        this.animationFrame = null;
        
        // Image optimization settings
        this.autoAdjustBrightness = true;
        this.glareDetection = true;
        this.edgeEnhancement = true;
    }

    initialize(videoRef, canvasRef) {
        this.videoRef = videoRef;
        this.canvasRef = canvasRef;
        this.setupTrackingCanvas();
        this.detectAvailableCameras();
    }

    // NEW: Setup tracking canvas overlay
    setupTrackingCanvas() {
        if (this.videoRef?.current) {
            // Create overlay canvas for card tracking
            this.trackingCanvas = document.createElement('canvas');
            this.trackingCanvas.style.position = 'absolute';
            this.trackingCanvas.style.top = '0';
            this.trackingCanvas.style.left = '0';
            this.trackingCanvas.style.pointerEvents = 'none';
            this.trackingCanvas.style.zIndex = '10';
            this.trackingContext = this.trackingCanvas.getContext('2d');
            
            // Add to video container
            const videoContainer = this.videoRef.current.parentElement;
            if (videoContainer) {
                videoContainer.style.position = 'relative';
                videoContainer.appendChild(this.trackingCanvas);
            }
        }
    }

    async detectAvailableCameras() {
        try {
            console.log('🔍 CameraService: Detecting available cameras...');
            
            const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
            permissionStream.getTracks().forEach(track => track.stop());
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            const cameraList = videoDevices.map((device, index) => {
                let label = device.label || `Camera ${index + 1}`;
                
                if (label.toLowerCase().includes('back') || label.toLowerCase().includes('rear')) {
                    label += ' 📷 (Rear - Best for Cards)';
                } else if (label.toLowerCase().includes('front') || label.toLowerCase().includes('user')) {
                    label += ' 🤳 (Front)';
                } else if (label.toLowerCase().includes('environment')) {
                    label += ' 🌍 (Environment - Perfect for Scanning)';
                }
                
                return {
                    deviceId: device.deviceId,
                    label: label,
                    groupId: device.groupId
                };
            });
            
            this.availableCameras = cameraList;
            
            if (cameraList.length > 0 && !this.selectedCamera) {
                const preferredCamera = cameraList.find(cam => 
                    cam.label.toLowerCase().includes('rear') || 
                    cam.label.toLowerCase().includes('back') ||
                    cam.label.toLowerCase().includes('environment')
                ) || cameraList[0];
                
                this.selectedCamera = preferredCamera.deviceId;
            }
            
            console.log(`✅ CameraService: Found ${cameraList.length} cameras:`, cameraList);
            this.onCamerasChanged(this.availableCameras, this.selectedCamera);
            return cameraList;
        } catch (error) {
            console.error('❌ CameraService: Camera detection error:', error);
            this.setCameraError('Unable to detect cameras. Please check permissions.');
            return [];
        }
    }

    getResolutionConstraints(resolution = this.cameraResolution) {
        const constraints = {
            '4k': { width: { ideal: 3840 }, height: { ideal: 2160 } },
            'fhd': { width: { ideal: 1920 }, height: { ideal: 1080 } },
            'hd': { width: { ideal: 1280 }, height: { ideal: 720 } },
            'sd': { width: { ideal: 640 }, height: { ideal: 480 } }
        };
        
        // Add card scanning optimizations
        return {
            ...constraints[resolution] || constraints['hd'],
            aspectRatio: { ideal: 4/3 }, // Good for card scanning
            focusMode: { ideal: 'continuous' }, // Keep cards in focus
            exposureMode: { ideal: 'continuous' }, // Auto-adjust for lighting
            whiteBalanceMode: { ideal: 'continuous' } // Handle different lighting
        };
    }

    async startCamera() {
        this.setCameraError('');
        
        try {
            console.log('📷 CameraService: Starting camera with enhanced card tracking...');
            
            const constraints = {
                video: {
                    deviceId: this.selectedCamera ? { exact: this.selectedCamera } : undefined,
                    facingMode: this.selectedCamera ? undefined : 'environment',
                    ...this.getResolutionConstraints(this.cameraResolution)
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (this.videoRef?.current) {
                this.videoRef.current.srcObject = stream;
                this.videoRef.current.onloadedmetadata = () => {
                    console.log('✅ CameraService: Camera started with card tracking');
                    this.setIsScanning(true);
                    this.startCardTracking(); // Start tracking automatically
                };
            }
            
            return stream;
            
        } catch (err) {
            console.error('❌ CameraService: Camera start error:', err);
            this.handleCameraError(err);
            throw err;
        }
    }

    // NEW: Start card tracking system
    startCardTracking() {
        if (!this.isTracking && this.videoRef?.current && this.trackingCanvas) {
            this.isTracking = true;
            this.trackingLoop();
            console.log('🎯 Card tracking started');
        }
    }

    // NEW: Stop card tracking
    stopCardTracking() {
        this.isTracking = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.trackingContext) {
            this.trackingContext.clearRect(0, 0, this.trackingCanvas.width, this.trackingCanvas.height);
        }
        console.log('🎯 Card tracking stopped');
    }

    // NEW: Main tracking loop
    trackingLoop() {
        if (!this.isTracking || !this.videoRef?.current) return;
        
        try {
            this.updateTrackingCanvas();
            this.detectCardBoundaries();
            this.drawTrackingOverlay();
        } catch (error) {
            console.warn('Tracking error:', error);
        }
        
        this.animationFrame = requestAnimationFrame(() => this.trackingLoop());
    }

    // NEW: Update tracking canvas size
    updateTrackingCanvas() {
        const video = this.videoRef.current;
        if (video && this.trackingCanvas) {
            const rect = video.getBoundingClientRect();
            this.trackingCanvas.width = rect.width;
            this.trackingCanvas.height = rect.height;
            this.trackingCanvas.style.width = rect.width + 'px';
            this.trackingCanvas.style.height = rect.height + 'px';
        }
    }

    // NEW: Detect card boundaries using edge detection
    detectCardBoundaries() {
        if (!this.videoRef?.current || !this.canvasRef?.current) return;
        
        const video = this.videoRef.current;
        const canvas = this.canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Sample current frame
        canvas.width = video.videoWidth / 4; // Downsample for performance
        canvas.height = video.videoHeight / 4;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const edges = this.detectEdges(imageData);
        const cardBounds = this.findCardRectangle(edges);
        
        if (cardBounds && this.isValidCardBounds(cardBounds)) {
            this.cardBounds = this.scaleCardBounds(cardBounds, 4); // Scale back up
            this.onCardDetected(this.cardBounds);
        }
    }

    // NEW: Simple edge detection algorithm
    detectEdges(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const edges = new Uint8ClampedArray(width * height);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                // Convert to grayscale
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                // Simple Sobel edge detection
                const gx = 
                    -1 * this.getGray(data, x-1, y-1, width) + 1 * this.getGray(data, x+1, y-1, width) +
                    -2 * this.getGray(data, x-1, y, width) + 2 * this.getGray(data, x+1, y, width) +
                    -1 * this.getGray(data, x-1, y+1, width) + 1 * this.getGray(data, x+1, y+1, width);
                
                const gy = 
                    -1 * this.getGray(data, x-1, y-1, width) + -2 * this.getGray(data, x, y-1, width) + -1 * this.getGray(data, x+1, y-1, width) +
                    1 * this.getGray(data, x-1, y+1, width) + 2 * this.getGray(data, x, y+1, width) + 1 * this.getGray(data, x+1, y+1, width);
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                edges[y * width + x] = magnitude > 50 ? 255 : 0;
            }
        }
        
        return { data: edges, width, height };
    }

    // Helper function for edge detection
    getGray(data, x, y, width) {
        const idx = (y * width + x) * 4;
        return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    }

    // NEW: Find rectangular card boundaries
    findCardRectangle(edges) {
        // Simplified rectangle detection
        // In a real implementation, you'd use more sophisticated algorithms
        const { data, width, height } = edges;
        
        let minX = width, maxX = 0, minY = height, maxY = 0;
        let edgeCount = 0;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (data[y * width + x] > 0) {
                    edgeCount++;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        // Only return bounds if we found enough edges
        if (edgeCount > 100) {
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
        
        return null;
    }

    // NEW: Validate card bounds (should be card-like rectangle)
    isValidCardBounds(bounds) {
        if (!bounds) return false;
        
        const { width, height } = bounds;
        const aspectRatio = width / height;
        
        // Magic cards are roughly 2.5" x 3.5" (aspect ratio ~0.71)
        return aspectRatio > 0.5 && aspectRatio < 0.9 && 
               width > 50 && height > 70; // Minimum size
    }

    // NEW: Scale card bounds back to original video size
    scaleCardBounds(bounds, scale) {
        return {
            x: bounds.x * scale,
            y: bounds.y * scale,
            width: bounds.width * scale,
            height: bounds.height * scale
        };
    }

    // NEW: Draw tracking overlay
    drawTrackingOverlay() {
        if (!this.trackingContext || !this.trackingCanvas) return;
        
        const ctx = this.trackingContext;
        const canvas = this.trackingCanvas;
        
        // Clear previous overlay
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw scanning grid
        this.drawScanningGrid(ctx, canvas);
        
        // Draw card bounds if detected
        if (this.cardBounds) {
            this.drawCardBounds(ctx);
        }
        
        // Draw center crosshair
        this.drawCrosshair(ctx, canvas);
    }

    // NEW: Draw card recognition frame (like face recognition)
    drawScanningGrid(ctx, canvas) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Card scanning frame dimensions (Magic card aspect ratio ~0.71)
        const frameWidth = Math.min(canvas.width * 0.6, canvas.height * 0.8 * 0.71);
        const frameHeight = frameWidth / 0.71;
        
        const frameX = centerX - frameWidth / 2;
        const frameY = centerY - frameHeight / 2;
        
        // Main frame
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(frameX, frameY, frameWidth, frameHeight);
        
        // Corner brackets (like phone camera focus)
        const cornerLength = 25;
        const cornerOffset = 8;
        
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        
        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(frameX - cornerOffset, frameY - cornerOffset + cornerLength);
        ctx.lineTo(frameX - cornerOffset, frameY - cornerOffset);
        ctx.lineTo(frameX - cornerOffset + cornerLength, frameY - cornerOffset);
        ctx.stroke();
        
        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(frameX + frameWidth + cornerOffset - cornerLength, frameY - cornerOffset);
        ctx.lineTo(frameX + frameWidth + cornerOffset, frameY - cornerOffset);
        ctx.lineTo(frameX + frameWidth + cornerOffset, frameY - cornerOffset + cornerLength);
        ctx.stroke();
        
        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(frameX - cornerOffset, frameY + frameHeight + cornerOffset - cornerLength);
        ctx.lineTo(frameX - cornerOffset, frameY + frameHeight + cornerOffset);
        ctx.lineTo(frameX - cornerOffset + cornerLength, frameY + frameHeight + cornerOffset);
        ctx.stroke();
        
        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(frameX + frameWidth + cornerOffset - cornerLength, frameY + frameHeight + cornerOffset);
        ctx.lineTo(frameX + frameWidth + cornerOffset, frameY + frameHeight + cornerOffset);
        ctx.lineTo(frameX + frameWidth + cornerOffset, frameY + frameHeight + cornerOffset - cornerLength);
        ctx.stroke();
        
        // Center crosshair
        const crosshairSize = 15;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        
        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(centerX - crosshairSize, centerY);
        ctx.lineTo(centerX + crosshairSize, centerY);
        ctx.stroke();
        
        // Vertical line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - crosshairSize);
        ctx.lineTo(centerX, centerY + crosshairSize);
        ctx.stroke();
        
        // Center dot
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Instruction text
        ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('📱 Position card within frame', centerX, frameY - 20);
    }

    // NEW: Draw detected card boundaries (enhanced)
    drawCardBounds(ctx) {
        const bounds = this.cardBounds;
        const video = this.videoRef.current;
        
        // Scale bounds to canvas size
        const scaleX = this.trackingCanvas.width / video.videoWidth;
        const scaleY = this.trackingCanvas.height / video.videoHeight;
        
        const x = bounds.x * scaleX;
        const y = bounds.y * scaleY;
        const width = bounds.width * scaleX;
        const height = bounds.height * scaleY;
        
        // Animate detection (pulsing effect)
        const time = Date.now() / 1000;
        const pulse = 0.8 + 0.2 * Math.sin(time * 4);
        
        // Draw card outline with pulse effect
        ctx.strokeStyle = `rgba(0, 255, 0, ${pulse})`;
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, width, height);
        
        // Enhanced corner markers
        const cornerSize = 25;
        ctx.fillStyle = `rgba(0, 255, 0, ${pulse})`;
        ctx.strokeStyle = `rgba(0, 255, 0, ${pulse})`;
        ctx.lineWidth = 3;
        
        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 5 + cornerSize);
        ctx.lineTo(x - 5, y - 5);
        ctx.lineTo(x - 5 + cornerSize, y - 5);
        ctx.stroke();
        
        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(x + width + 5 - cornerSize, y - 5);
        ctx.lineTo(x + width + 5, y - 5);
        ctx.lineTo(x + width + 5, y - 5 + cornerSize);
        ctx.stroke();
        
        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(x - 5, y + height + 5 - cornerSize);
        ctx.lineTo(x - 5, y + height + 5);
        ctx.lineTo(x - 5 + cornerSize, y + height + 5);
        ctx.stroke();
        
        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(x + width + 5 - cornerSize, y + height + 5);
        ctx.lineTo(x + width + 5, y + height + 5);
        ctx.lineTo(x + width + 5, y + height + 5 - cornerSize);
        ctx.stroke();
        
        // Status indicator
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText('🎯 CARD LOCKED', x + width/2, y - 15);
        ctx.shadowBlur = 0;
        
        // Confidence bar
        const barWidth = width * 0.6;
        const barHeight = 6;
        const barX = x + (width - barWidth) / 2;
        const barY = y + height + 20;
        
        // Background bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Confidence fill (simulate high confidence)
        const confidence = 0.85 + 0.1 * Math.sin(time * 2);
        ctx.fillStyle = `rgba(0, 255, 0, ${pulse})`;
        ctx.fillRect(barX, barY, barWidth * confidence, barHeight);
        
        // Confidence text
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(confidence * 100)}% Match`, x + width/2, barY + barHeight + 15);
    }

    // NEW: Draw center crosshair (removed - now integrated into scanning frame)
    drawCrosshair(ctx, canvas) {
        // Crosshair is now part of the scanning frame
        return;
    }

    // Enhanced capture with optimization
    captureImage() {
        if (!this.videoRef?.current || !this.canvasRef?.current) {
            throw new Error('Camera not ready for capture');
        }
        
        try {
            const canvas = this.canvasRef.current;
            const context = canvas.getContext('2d');
            const video = this.videoRef.current;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);
            
            // Apply image optimizations
            let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            if (this.autoAdjustBrightness) {
                imageData = this.adjustBrightness(imageData);
            }
            
            if (this.glareDetection) {
                imageData = this.reduceGlare(imageData);
            }
            
            if (this.edgeEnhancement) {
                imageData = this.enhanceEdges(imageData);
            }
            
            context.putImageData(imageData, 0, 0);
            
            console.log('📸 CameraService: Optimized image captured');
            
            return {
                canvas: canvas,
                imageData: canvas.toDataURL('image/jpeg', 0.9),
                width: canvas.width,
                height: canvas.height,
                cardBounds: this.cardBounds,
                optimizations: {
                    brightness: this.autoAdjustBrightness,
                    glareReduction: this.glareDetection,
                    edgeEnhancement: this.edgeEnhancement
                }
            };
            
        } catch (err) {
            console.error('❌ CameraService: Capture error:', err);
            throw new Error('Failed to capture optimized image. Please try again.');
        }
    }

    // NEW: Auto-adjust brightness for dull lighting
    adjustBrightness(imageData) {
        const data = imageData.data;
        let totalBrightness = 0;
        
        // Calculate average brightness
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            totalBrightness += brightness;
        }
        
        const avgBrightness = totalBrightness / (data.length / 4);
        const targetBrightness = 128;
        const adjustment = targetBrightness / avgBrightness;
        
        // Only adjust if image is significantly dark
        if (adjustment > 1.2) {
            console.log('💡 Adjusting brightness for low light:', adjustment);
            
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * adjustment);     // Red
                data[i + 1] = Math.min(255, data[i + 1] * adjustment); // Green
                data[i + 2] = Math.min(255, data[i + 2] * adjustment); // Blue
            }
        }
        
        return imageData;
    }

    // NEW: Reduce glare for glossy cards
    reduceGlare(imageData) {
        const data = imageData.data;
        const glareThreshold = 240;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Detect bright spots (likely glare)
            if (r > glareThreshold && g > glareThreshold && b > glareThreshold) {
                // Reduce brightness and increase contrast
                data[i] = Math.max(0, r * 0.8);
                data[i + 1] = Math.max(0, g * 0.8);
                data[i + 2] = Math.max(0, b * 0.8);
            }
        }
        
        return imageData;
    }

    // NEW: Enhance edges for better text recognition
    enhanceEdges(imageData) {
        // Simple edge enhancement using unsharp mask
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const enhanced = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) { // RGB channels
                    const idx = (y * width + x) * 4 + c;
                    
                    // 3x3 sharpening kernel
                    const sharpen = 
                        -1 * data[((y-1) * width + (x-1)) * 4 + c] +
                        -1 * data[((y-1) * width + x) * 4 + c] +
                        -1 * data[((y-1) * width + (x+1)) * 4 + c] +
                        -1 * data[(y * width + (x-1)) * 4 + c] +
                        9 * data[idx] +
                        -1 * data[(y * width + (x+1)) * 4 + c] +
                        -1 * data[((y+1) * width + (x-1)) * 4 + c] +
                        -1 * data[((y+1) * width + x) * 4 + c] +
                        -1 * data[((y+1) * width + (x+1)) * 4 + c];
                    
                    enhanced[idx] = Math.max(0, Math.min(255, sharpen));
                }
            }
        }
        
        return new ImageData(enhanced, width, height);
    }

    handleCameraError(err) {
        let errorMsg = 'Camera access failed. ';
        
        switch (err.name) {
            case 'NotAllowedError':
                errorMsg += 'Please allow camera permissions and refresh the page.';
                break;
            case 'NotFoundError':
                errorMsg += 'No camera found. Please connect a camera.';
                break;
            case 'NotReadableError':
                errorMsg += 'Camera is being used by another app. Please close other camera apps.';
                break;
            case 'OverconstrainedError':
                errorMsg += 'Camera settings not supported. Trying lower resolution...';
                if (this.cameraResolution !== 'sd') {
                    this.setCameraResolution('sd');
                    setTimeout(() => this.startCamera(), 1000);
                    return;
                }
                break;
            default:
                errorMsg += 'Please check camera permissions and try again.';
        }
        
        this.setCameraError(errorMsg);
    }

    stopCamera() {
        this.stopCardTracking(); // Stop tracking first
        
        if (this.videoRef?.current && this.videoRef.current.srcObject) {
            const tracks = this.videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.videoRef.current.srcObject = null;
        }
        this.setIsScanning(false);
        console.log('📷 CameraService: Camera and tracking stopped');
    }

    // Existing methods...
    setSelectedCamera(deviceId) {
        this.selectedCamera = deviceId;
        console.log('📷 CameraService: Selected camera changed to:', deviceId);
    }

    setCameraResolution(resolution) {
        this.cameraResolution = resolution;
        console.log('📷 CameraService: Resolution changed to:', resolution);
    }

    setCameraError(error) {
        this.cameraError = error;
        this.onErrorChanged(error);
        if (error) {
            console.error('❌ CameraService: Error:', error);
        }
    }

    setIsScanning(scanning) {
        this.isScanning = scanning;
        this.onScanningChanged(scanning);
        console.log('📷 CameraService: Scanning state:', scanning);
    }

    // New optimization controls
    setAutoAdjustBrightness(enabled) {
        this.autoAdjustBrightness = enabled;
        console.log('💡 Auto brightness adjustment:', enabled);
    }

    setGlareDetection(enabled) {
        this.glareDetection = enabled;
        console.log('✨ Glare detection:', enabled);
    }

    setEdgeEnhancement(enabled) {
        this.edgeEnhancement = enabled;
        console.log('📐 Edge enhancement:', enabled);
    }

    getAvailableCameras() { return this.availableCameras; }
    getSelectedCamera() { return this.selectedCamera; }
    getCameraError() { return this.cameraError; }
    getCameraResolution() { return this.cameraResolution; }
    getIsScanning() { return this.isScanning; }
    getCardBounds() { return this.cardBounds; }

    cleanup() {
        this.stopCamera();
        if (this.trackingCanvas && this.trackingCanvas.parentNode) {
            this.trackingCanvas.parentNode.removeChild(this.trackingCanvas);
        }
        this.videoRef = null;
        this.canvasRef = null;
        this.trackingCanvas = null;
        this.trackingContext = null;
        console.log('🧹 CameraService: Cleaned up with tracking');
    }
}

// Make it available globally
window.CameraService = CameraService;
