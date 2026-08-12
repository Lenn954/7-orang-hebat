import { useRef, useState, useEffect, useCallback } from 'react';
import '../styles/CameraPage.css';

export default function CameraPage({ onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [preview, setPreview] = useState(null);
  const [flash, setFlash] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      alert('Please allow camera access to use this feature.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    // Mirror the image to match the mirrored video display
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPreview(dataUrl);
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
    stopCamera();
  };

  const handleRetake = () => {
    setPreview(null);
    startCamera();
  };

  const handleNext = () => {
    if (preview) onCapture(preview);
  };

  if (preview) {
    return (
      <section className="camera">
        <div className="camera-info">
          <div className="camera-status">
            <span>📸</span> Photo captured!
          </div>
        </div>
        <div className="camera-preview">
          <img src={preview} alt="Captured" className="camera-preview-img" />
          <div className="camera-preview-actions">
            <button className="camera-btn camera-btn-retake" onClick={handleRetake}>
              ↺ Retake
            </button>
            <button className="camera-btn camera-btn-next" onClick={handleNext} id="btn-to-puzzle">
              Continue to Puzzle →
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="camera">
      <div className="camera-info">
        <div className="camera-status">
          <span className="camera-status-dot" />
          {cameraReady ? 'Camera ready' : 'Starting camera...'}
        </div>
        <span className="camera-hint">Click the button to capture</span>
      </div>

      <div className="camera-viewport">
        <video ref={videoRef} autoPlay playsInline className="camera-video" />
        <div className={`camera-flash ${flash ? 'active' : ''}`} />

        {!cameraReady && (
          <div className="camera-loading">
            <div className="camera-loading-spinner" />
            Accessing camera...
          </div>
        )}

        {cameraReady && (
          <div className="camera-controls">
            <button className="camera-capture-btn" onClick={handleCapture} id="btn-capture" aria-label="Capture photo" />
          </div>
        )}
      </div>
    </section>
  );
}
