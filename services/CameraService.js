// CameraService.js - Professional Camera Management Module
// Copy/paste this ENTIRE file as services/CameraService.js

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
    }

    initialize(videoRef, canvasRef) {
        this.videoRef = videoRef;
        this.canvasRef = canvasRef;
        this.detectAvailableCameras();
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
                    label += ' 📷 (Rear)';
                } else if (label.toLowerCase().includes('front') || label.toLowerCase().includes('user')) {
                    label += ' 🤳 (Front)';
                } else if (label.toLowerCase().includes('environment')) {
                    label += ' 🌍 (Environment)';
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
        switch (resolution) {
            case '4k':
                return { width: { ideal: 3840 }, height: { ideal: 2160 } };
            case 'fhd':
                return { width: { ideal: 1920 }, height: { ideal: 1080 } };
            case 'hd':
                return { width: { ideal: 1280 }, height: { ideal: 720 } };
            default:
                return { width: { ideal: 640 }, height: { ideal: 480 } };
        }
    }

    async startCamera() {
        this.setCameraError('');
        
        try {
            console.log('📷 CameraService: Starting camera with', this.cameraResolution, 'resolution...');
            
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
                    console.log('✅ CameraService: Camera started successfully');
                    this.setIsScanning(true);
                };
            }
            
            return stream;
            
        } catch (err) {
            console.error('❌ CameraService: Camera start error:', err);
            this.handleCameraError(err);
            throw err;
        }
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
        if (this.videoRef?.current && this.videoRef.current.srcObject) {
            const tracks = this.videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.videoRef.current.srcObject = null;
        }
        this.setIsScanning(false);
        console.log('📷 CameraService: Camera stopped');
    }

    captureImage() {
        if (!this.videoRef?.current || !this.canvasRef?.current) {
            throw new Error('Camera not ready for capture');
        }
        
        try {
            const canvas = this.canvasRef.current;
            const context = canvas.getContext('2d');
            canvas.width = this.videoRef.current.videoWidth;
            canvas.height = this.videoRef.current.videoHeight;
            context.drawImage(this.videoRef.current, 0, 0);
            
            console.log('📸 CameraService: Image captured successfully');
            
            return {
                canvas: canvas,
                imageData: canvas.toDataURL('image/jpeg', 0.8),
                width: canvas.width,
                height: canvas.height
            };
            
        } catch (err) {
            console.error('❌ CameraService: Capture error:', err);
            throw new Error('Failed to capture image. Please try again.');
        }
    }

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

    getAvailableCameras() {
        return this.availableCameras;
    }

    getSelectedCamera() {
        return this.selectedCamera;
    }

    getCameraError() {
        return this.cameraError;
    }

    getCameraResolution() {
        return this.cameraResolution;
    }

    getIsScanning() {
        return this.isScanning;
    }

    cleanup() {
        this.stopCamera();
        this.videoRef = null;
        this.canvasRef = null;
        console.log('🧹 CameraService: Cleaned up');
    }
}

// Make it available globally for the HTML file
window.CameraService = CameraService;
