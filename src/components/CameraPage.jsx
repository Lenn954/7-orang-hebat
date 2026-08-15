import { useRef, useState, useEffect, useCallback } from 'react';
import '../styles/CameraPage.css';

export default function CameraPage({ mode, maxPhotos = 4, onPhotosCapture, peerPhotos = [] }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [flash, setFlash] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const countdownRef = useRef(null);

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
    return () => {
      stopCamera();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
    return dataUrl;
  }, []);

  const handleCapture = () => {
    if (isCountingDown) return;
    // Start countdown
    setIsCountingDown(true);
    setCountdown(3);
    let count = 3;
    countdownRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownRef.current);
        setCountdown(null);
        setIsCountingDown(false);
        const photo = capturePhoto();
        if (photo) {
          setPhotos((prev) => [...prev, photo]);
        }
      }
    }, 1000);
  };

  const handleQuickCapture = () => {
    if (isCountingDown) return;
    const photo = capturePhoto();
    if (photo) {
      setPhotos((prev) => [...prev, photo]);
    }
  };

  const handleRetake = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDone = () => {
    stopCamera();
    onPhotosCapture(photos);
  };

  const isFull = photos.length >= maxPhotos;

  return (
    <section className="camera">
      <div className="camera-info">
        <div className="camera-status">
          <span className="camera-status-dot" />
          {cameraReady ? 'Camera ready' : 'Starting camera...'}
        </div>
        <span className="camera-hint">
          📸 Foto {photos.length} / {maxPhotos}
        </span>
      </div>

      <div className="camera-main-area">
        <div className="camera-viewport">
          <video ref={videoRef} autoPlay playsInline className="camera-video" />
          <div className={`camera-flash ${flash ? 'active' : ''}`} />

          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="camera-countdown-overlay">
              <div className="camera-countdown-number">{countdown}</div>
            </div>
          )}

          {!cameraReady && (
            <div className="camera-loading">
              <div className="camera-loading-spinner" />
              Accessing camera...
            </div>
          )}

          {cameraReady && !isFull && (
            <div className="camera-controls">
              <button
                className="camera-capture-btn"
                onClick={handleCapture}
                disabled={isCountingDown}
                id="btn-capture"
                aria-label="Capture photo with countdown"
              />
              <button
                className="camera-quick-btn"
                onClick={handleQuickCapture}
                disabled={isCountingDown}
                title="Quick capture (no countdown)"
              >
                ⚡
              </button>
            </div>
          )}

          {isFull && (
            <div className="camera-full-overlay">
              <p>All {maxPhotos} photos captured! ✨</p>
            </div>
          )}
        </div>

        {/* Photo strip preview */}
        <div className="camera-strip">
          <div className="camera-strip-header">
            <h3>Your Photos</h3>
            {photos.length > 0 && (
              <span className="camera-strip-count">{photos.length}/{maxPhotos}</span>
            )}
          </div>
          <div className="camera-strip-photos">
            {Array.from({ length: maxPhotos }, (_, i) => (
              <div key={i} className={`camera-strip-slot ${photos[i] ? 'filled' : ''}`}>
                {photos[i] ? (
                  <>
                    <img src={photos[i]} alt={`Photo ${i + 1}`} />
                    <button
                      className="camera-strip-retake"
                      onClick={() => handleRetake(i)}
                      title="Retake"
                    >
                      ↺
                    </button>
                    <span className="camera-strip-number">{i + 1}</span>
                  </>
                ) : (
                  <div className="camera-strip-empty">
                    <span>{i + 1}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Peer photos in room mode */}
          {mode === 'room' && peerPhotos.length > 0 && (
            <div className="camera-peer-photos">
              <h4 className="camera-peer-title">Foto Teman</h4>
              <div className="camera-strip-photos">
                {peerPhotos.map((p, i) => (
                  <div key={i} className="camera-strip-slot filled peer">
                    <img src={p.imageData} alt={`${p.name} photo`} />
                    <span className="camera-strip-peer-name">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {photos.length > 0 && (
            <button
              className="camera-done-btn"
              onClick={handleDone}
              id="btn-photos-done"
            >
              {isFull ? 'Lanjut Edit! ✨' : `Lanjut dengan ${photos.length} foto →`}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
