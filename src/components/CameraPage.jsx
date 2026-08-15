import { useRef, useState, useEffect, useCallback } from 'react';
import { combinePhotosToComposite } from '../utils/canvasUtils';
import '../styles/CameraPage.css';

export default function CameraPage({ mode, maxPhotos = 4, onPhotosCapture, peerRoom, peerPhotos = [] }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [flash, setFlash] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [combining, setCombining] = useState(false);
  const countdownRef = useRef(null);

  // In room mode, we capture 1 photo per person and combine them
  const isRoom = mode === 'room';
  const effectiveMaxPhotos = isRoom ? 1 : maxPhotos;

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
          // In room mode, broadcast immediately
          if (isRoom && peerRoom) {
            peerRoom.broadcastPhoto(photo, 0);
          }
        }
      }
    }, 1000);
  };

  const handleQuickCapture = () => {
    if (isCountingDown) return;
    const photo = capturePhoto();
    if (photo) {
      setPhotos((prev) => [...prev, photo]);
      if (isRoom && peerRoom) {
        peerRoom.broadcastPhoto(photo, 0);
      }
    }
  };

  const handleRetake = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // For Room mode: combine my photo + peer photos into composite images
  const handleDoneRoom = async () => {
    if (photos.length === 0) return;
    setCombining(true);
    try {
      // Collect all photos: mine + peers
      const allPeoplePhotos = [
        photos[0], // my photo
        ...peerPhotos.map((p) => p.imageData),
      ];

      // Create composite images in different arrangements
      const composites = [];

      // Main composite: everyone together in one photo
      const mainComposite = await combinePhotosToComposite(allPeoplePhotos);
      composites.push(mainComposite);

      // If I have more of my own photos (shouldn't in room mode, but just in case)
      if (photos.length > 1) {
        photos.slice(1).forEach((p) => composites.push(p));
      }

      stopCamera();
      onPhotosCapture(composites);
    } catch (err) {
      console.error('Failed to combine photos:', err);
      // Fallback: just send raw photos
      stopCamera();
      onPhotosCapture(photos);
    }
    setCombining(false);
  };

  // For Solo mode: just pass photos through
  const handleDoneSolo = () => {
    stopCamera();
    onPhotosCapture(photos);
  };

  const handleDone = isRoom ? handleDoneRoom : handleDoneSolo;

  const myPhotoTaken = photos.length > 0;
  const isFull = isRoom ? myPhotoTaken : photos.length >= maxPhotos;

  // Count total people in room
  const totalPeople = isRoom ? 1 + peerPhotos.length : 0;
  const peersCaptured = peerPhotos.length;

  return (
    <section className="camera">
      <div className="camera-info">
        <div className="camera-status">
          <span className="camera-status-dot" />
          {cameraReady ? 'Camera ready' : 'Starting camera...'}
        </div>
        <span className="camera-hint">
          {isRoom
            ? `👥 ${1 + peersCaptured} orang di room`
            : `📸 Foto ${photos.length} / ${maxPhotos}`
          }
        </span>
      </div>

      <div className="camera-main-area">
        <div className="camera-viewport">
          <video ref={videoRef} autoPlay playsInline className="camera-video" />
          <div className={`camera-flash ${flash ? 'active' : ''}`} />

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

          {isFull && !isRoom && (
            <div className="camera-full-overlay">
              <p>All {maxPhotos} photos captured! ✨</p>
            </div>
          )}

          {isFull && isRoom && (
            <div className="camera-full-overlay">
              <p>Foto kamu sudah diambil! ✅</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="camera-strip">
          {/* ROOM MODE: Show combined group photo preview */}
          {isRoom && (
            <>
              <div className="camera-strip-header">
                <h3>Foto Bareng 👥</h3>
              </div>

              <div className="camera-group-preview">
                {/* My photo slot */}
                <div className={`camera-group-slot ${myPhotoTaken ? 'filled' : ''}`}>
                  {myPhotoTaken ? (
                    <>
                      <img src={photos[0]} alt="Foto kamu" />
                      <span className="camera-group-label">Kamu</span>
                      <button className="camera-strip-retake" onClick={() => handleRetake(0)} title="Retake">↺</button>
                    </>
                  ) : (
                    <div className="camera-group-empty">
                      <span>📷</span>
                      <small>Kamu</small>
                    </div>
                  )}
                </div>

                {/* Peer photo slots */}
                {peerPhotos.map((p, i) => (
                  <div key={i} className="camera-group-slot filled peer">
                    <img src={p.imageData} alt={`Foto ${p.name}`} />
                    <span className="camera-group-label">{p.name}</span>
                  </div>
                ))}

                {/* Waiting slots for peers who haven't captured yet */}
                {peerRoom && (() => {
                  const allPeers = peerRoom.getAllPeers().filter((p) => !p.isSelf);
                  const capturedPeerIds = new Set(peerPhotos.map((p) => p.peerId));
                  const waiting = allPeers.filter((p) => !capturedPeerIds.has(p.peerId));
                  return waiting.map((p) => (
                    <div key={p.peerId} className="camera-group-slot waiting">
                      <div className="camera-group-empty">
                        <div className="camera-group-waiting-spinner" />
                        <small>{p.name}</small>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Combined preview */}
              {myPhotoTaken && peerPhotos.length > 0 && (
                <div className="camera-combine-preview">
                  <p className="camera-combine-label">📸 Hasil gabungan foto bareng</p>
                  <div className="camera-combine-grid">
                    <div className="camera-combine-thumb">
                      <img src={photos[0]} alt="Kamu" />
                    </div>
                    {peerPhotos.map((p, i) => (
                      <div key={i} className="camera-combine-thumb">
                        <img src={p.imageData} alt={p.name} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {myPhotoTaken && (
                <button
                  className="camera-done-btn"
                  onClick={handleDone}
                  disabled={combining}
                  id="btn-photos-done"
                >
                  {combining
                    ? '⏳ Menggabungkan foto...'
                    : peerPhotos.length > 0
                      ? `Gabungkan & Edit! (${1 + peerPhotos.length} orang) 🎉`
                      : 'Tunggu teman atau lanjut sendiri →'
                  }
                </button>
              )}

              {!myPhotoTaken && (
                <p className="camera-room-hint">
                  Ambil foto kamu dulu, lalu tunggu teman mengambil foto mereka. 
                  Semua foto akan digabungkan jadi satu! 🎉
                </p>
              )}
            </>
          )}

          {/* SOLO MODE: Photo strip */}
          {!isRoom && (
            <>
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

              {photos.length > 0 && (
                <button
                  className="camera-done-btn"
                  onClick={handleDone}
                  id="btn-photos-done"
                >
                  {isFull ? 'Lanjut Edit! ✨' : `Lanjut dengan ${photos.length} foto →`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
