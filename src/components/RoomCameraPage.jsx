import { useRef, useState, useEffect, useCallback } from 'react';
import { combinePhotosToComposite, captureVideoFrame } from '../utils/canvasUtils';
import '../styles/RoomCameraPage.css';

const MAX_ROUNDS = 4;

export default function RoomCameraPage({ peerRoom, onPhotosCapture, onBack }) {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteVideoRefs = useRef({}); // peerId -> ref
  const [cameraReady, setCameraReady] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState([]); // [{peerId, stream, name}]
  const [countdown, setCountdown] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedRounds, setCapturedRounds] = useState([]); // array of composite data URLs
  const [peerCapturedPhotos, setPeerCapturedPhotos] = useState({}); // { roundIndex: { peerId: dataUrl } }
  const [currentRound, setCurrentRound] = useState(0);
  const [flash, setFlash] = useState(false);
  const [combining, setCombining] = useState(false);
  const countdownRef = useRef(null);

  // Start local camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setCameraReady(true);

      // Start video call with peers
      if (peerRoom) {
        peerRoom.startVideoCall(stream);
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      alert('Izinkan akses kamera untuk menggunakan fitur ini.');
    }
  }, [peerRoom]);

  // Setup peer event listeners
  useEffect(() => {
    if (!peerRoom) return;

    const onStreamReceived = ({ peerId, stream, name }) => {
      setRemoteStreams((prev) => {
        const exists = prev.find((s) => s.peerId === peerId);
        if (exists) {
          return prev.map((s) => (s.peerId === peerId ? { ...s, stream, name } : s));
        }
        return [...prev, { peerId, stream, name }];
      });
    };

    const onStreamRemoved = ({ peerId }) => {
      setRemoteStreams((prev) => prev.filter((s) => s.peerId !== peerId));
    };

    const onCountdownTick = ({ count }) => {
      setCountdown(count);
      if (count <= 0) {
        doCapture();
      }
    };

    const onCaptureSignal = () => {
      doCapture();
    };

    const onCapturedPhoto = ({ peerId, imageData, roundIndex }) => {
      setPeerCapturedPhotos((prev) => ({
        ...prev,
        [roundIndex]: {
          ...(prev[roundIndex] || {}),
          [peerId]: imageData,
        },
      }));
    };

    peerRoom.on('streamReceived', onStreamReceived);
    peerRoom.on('streamRemoved', onStreamRemoved);
    peerRoom.on('countdownTick', onCountdownTick);
    peerRoom.on('captureSignal', onCaptureSignal);
    peerRoom.on('capturedPhoto', onCapturedPhoto);

    return () => {
      peerRoom.off('streamReceived', onStreamReceived);
      peerRoom.off('streamRemoved', onStreamRemoved);
      peerRoom.off('countdownTick', onCountdownTick);
      peerRoom.off('captureSignal', onCaptureSignal);
      peerRoom.off('capturedPhoto', onCapturedPhoto);
    };
  }, [peerRoom]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [startCamera]);

  // Attach remote streams to video elements
  useEffect(() => {
    remoteStreams.forEach(({ peerId, stream }) => {
      const videoEl = remoteVideoRefs.current[peerId];
      if (videoEl && videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  // Capture local frame from video
  const doCapture = useCallback(() => {
    if (!localVideoRef.current || isCapturing) return;
    setIsCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 400);

    // Capture local photo (high res from camera stream)
    const localPhoto = captureVideoFrame(localVideoRef.current, true);

    // Send to peers
    if (peerRoom) {
      peerRoom.sendCapturedPhoto(localPhoto, currentRound);
    }

    // Capture remote frames from video elements (lower res fallback)
    const remoteFallbackPhotos = {};
    remoteStreams.forEach(({ peerId }) => {
      const videoEl = remoteVideoRefs.current[peerId];
      if (videoEl) {
        remoteFallbackPhotos[peerId] = captureVideoFrame(videoEl, false);
      }
    });

    // Wait a bit for high-res photos from peers, then combine
    setTimeout(async () => {
      const highResPhotos = peerCapturedPhotos[currentRound] || {};
      const allPhotos = [localPhoto];

      remoteStreams.forEach(({ peerId }) => {
        // Use high-res received photo if available, else fallback to video frame
        const photo = highResPhotos[peerId] || remoteFallbackPhotos[peerId];
        if (photo) allPhotos.push(photo);
      });

      try {
        const composite = await combinePhotosToComposite(allPhotos);
        setCapturedRounds((prev) => [...prev, composite]);
        setCurrentRound((prev) => prev + 1);
      } catch (err) {
        console.error('Failed to create composite:', err);
        // Use just local photo as fallback
        setCapturedRounds((prev) => [...prev, localPhoto]);
        setCurrentRound((prev) => prev + 1);
      }

      setIsCapturing(false);
      setCountdown(null);
    }, 2000); // Wait 2s for peer photos to arrive
  }, [isCapturing, currentRound, remoteStreams, peerCapturedPhotos, peerRoom]);

  // Host starts countdown
  const handleStartCountdown = () => {
    if (isCapturing || !peerRoom) return;
    let count = 3;
    setCountdown(count);
    peerRoom.broadcastCountdown(count);

    countdownRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        peerRoom.broadcastCountdown(count);
      } else {
        clearInterval(countdownRef.current);
        setCountdown(0);
        peerRoom.broadcastCaptureSignal();
        doCapture();
      }
    }, 1000);
  };

  // Guest manual capture (non-host can also capture)
  const handleGuestCapture = () => {
    if (isCapturing) return;
    let count = 3;
    setCountdown(count);

    countdownRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownRef.current);
        setCountdown(0);
        doCapture();
      }
    }, 1000);
  };

  // Done — send composites to editor
  const handleDone = () => {
    if (peerRoom) {
      peerRoom.stopVideo();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    onPhotosCapture(capturedRounds);
  };

  const handleRetakeRound = (index) => {
    setCapturedRounds((prev) => prev.filter((_, i) => i !== index));
    setCurrentRound((prev) => prev - 1);
  };

  const totalPeople = 1 + remoteStreams.length;
  const isFull = capturedRounds.length >= MAX_ROUNDS;
  const gridClass = totalPeople <= 2 ? 'grid-2' : totalPeople === 3 ? 'grid-3' : 'grid-4';

  return (
    <section className="room-camera">
      {/* Header info */}
      <div className="room-camera-info">
        <div className="room-camera-status">
          <span className="room-camera-dot" />
          <span>{totalPeople} orang terhubung</span>
        </div>
        <span className="room-camera-round">
          📸 Ronde {capturedRounds.length} / {MAX_ROUNDS}
        </span>
      </div>

      <div className="room-camera-main">
        {/* Video Grid */}
        <div className={`room-camera-grid ${gridClass}`}>
          {/* Local video */}
          <div className="room-camera-cell local">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="room-camera-video"
            />
            <div className="room-camera-label">Kamu</div>
            {!cameraReady && (
              <div className="room-camera-loading">
                <div className="room-camera-spinner" />
                Mengakses kamera...
              </div>
            )}
          </div>

          {/* Remote videos */}
          {remoteStreams.map(({ peerId, name }) => (
            <div key={peerId} className="room-camera-cell remote">
              <video
                ref={(el) => { remoteVideoRefs.current[peerId] = el; }}
                autoPlay
                playsInline
                className="room-camera-video"
              />
              <div className="room-camera-label">{name}</div>
            </div>
          ))}

          {/* Empty slots */}
          {totalPeople < 2 && (
            <div className="room-camera-cell empty">
              <div className="room-camera-empty-content">
                <div className="room-camera-empty-icon">👥</div>
                <p>Menunggu teman bergabung...</p>
              </div>
            </div>
          )}

          {/* Flash overlay */}
          <div className={`room-camera-flash ${flash ? 'active' : ''}`} />

          {/* Countdown overlay */}
          {countdown !== null && countdown > 0 && (
            <div className="room-camera-countdown">
              <div className="room-camera-countdown-num">{countdown}</div>
            </div>
          )}

          {countdown === 0 && isCapturing && (
            <div className="room-camera-countdown">
              <div className="room-camera-countdown-num cheese">📸</div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="room-camera-sidebar">
          <h3 className="room-camera-sidebar-title">Foto Bareng 👥</h3>

          {/* Capture controls */}
          <div className="room-camera-controls">
            {!isFull && cameraReady && (
              <>
                {peerRoom?.isHost ? (
                  <button
                    className="room-camera-capture-btn"
                    onClick={handleStartCountdown}
                    disabled={isCapturing || remoteStreams.length === 0}
                  >
                    {isCapturing ? '⏳ Capturing...' : `📸 Foto Bareng! (${totalPeople} orang)`}
                  </button>
                ) : (
                  <button
                    className="room-camera-capture-btn guest"
                    onClick={handleGuestCapture}
                    disabled={isCapturing}
                  >
                    {isCapturing ? '⏳ Capturing...' : '📸 Capture'}
                  </button>
                )}

                {remoteStreams.length === 0 && (
                  <p className="room-camera-hint">
                    Tunggu minimal 1 teman bergabung sebelum foto bareng
                  </p>
                )}
              </>
            )}

            {isFull && (
              <p className="room-camera-full">Semua {MAX_ROUNDS} ronde selesai! ✨</p>
            )}
          </div>

          {/* Captured rounds preview */}
          {capturedRounds.length > 0 && (
            <div className="room-camera-results">
              <h4 className="room-camera-results-title">Hasil Foto ({capturedRounds.length})</h4>
              <div className="room-camera-results-list">
                {capturedRounds.map((composite, i) => (
                  <div key={i} className="room-camera-result-item">
                    <img src={composite} alt={`Ronde ${i + 1}`} />
                    <span className="room-camera-result-badge">#{i + 1}</span>
                    <button
                      className="room-camera-result-retake"
                      onClick={() => handleRetakeRound(i)}
                      title="Retake"
                    >
                      ↺
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Done button */}
          {capturedRounds.length > 0 && (
            <button
              className="room-camera-done-btn"
              onClick={handleDone}
              disabled={combining}
            >
              {isFull ? 'Lanjut Edit! ✨' : `Lanjut dengan ${capturedRounds.length} foto →`}
            </button>
          )}

          {/* Privacy notice */}
          <p className="room-camera-privacy">
            🔒 Semua foto hanya ada di perangkat kamu. Tidak ada yang tersimpan di server.
          </p>
        </div>
      </div>
    </section>
  );
}
