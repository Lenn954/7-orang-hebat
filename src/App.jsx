import { useState, useRef } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import ConfigPage from './components/ConfigPage';
import CameraPage from './components/CameraPage';
import PuzzlePage from './components/PuzzlePage';
import EditorPage from './components/EditorPage';
import RoomPage from './components/RoomPage';
import DonatePage from './components/DonatePage';

const PAGES = {
  LANDING: 'landing',
  CONFIG: 'config',
  CAMERA: 'camera',
  PUZZLE: 'puzzle',
  EDITOR: 'editor',
  ROOM: 'room',
  DONATE: 'donate',
};

const PAGE_INDEX = {
  [PAGES.LANDING]: 0,
  [PAGES.CONFIG]: 1,
  [PAGES.ROOM]: 1,
  [PAGES.CAMERA]: 2,
  [PAGES.PUZZLE]: 3,
  [PAGES.EDITOR]: 4,
  [PAGES.DONATE]: 5,
};

export default function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.LANDING);
  const [mode, setMode] = useState(null); // 'solo' | 'room'
  const [gridSize, setGridSize] = useState(3);
  const [capturedImage, setCapturedImage] = useState(null);
  const [photos, setPhotos] = useState([]); // multi-photo array
  const [peerPhotos, setPeerPhotos] = useState([]); // photos from peers
  const peerRoomRef = useRef(null);

  const goTo = (page) => setCurrentPage(page);

  const handleRestart = () => {
    setCapturedImage(null);
    setPhotos([]);
    setPeerPhotos([]);
    setGridSize(3);
    setMode(null);
    if (peerRoomRef.current) {
      peerRoomRef.current.destroy();
      peerRoomRef.current = null;
    }
    setCurrentPage(PAGES.LANDING);
  };

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    if (selectedMode === 'solo') {
      goTo(PAGES.CONFIG);
    } else {
      goTo(PAGES.ROOM);
    }
  };

  const handleRoomReady = (peerRoom) => {
    peerRoomRef.current = peerRoom;
    // Listen for incoming photos from peers
    peerRoom.on('photoReceived', (data) => {
      setPeerPhotos((prev) => {
        const updated = [...prev];
        const existing = updated.findIndex(
          (p) => p.peerId === data.peerId && p.photoIndex === data.photoIndex
        );
        if (existing >= 0) {
          updated[existing] = data;
        } else {
          updated.push(data);
        }
        return updated;
      });
    });
    goTo(PAGES.CAMERA);
  };

  const handlePhotosCapture = (capturedPhotos) => {
    setPhotos(capturedPhotos);
    // In room mode, broadcast photos to peers
    if (mode === 'room' && peerRoomRef.current) {
      capturedPhotos.forEach((photo, idx) => {
        peerRoomRef.current.broadcastPhoto(photo, idx);
      });
    }
    // Set first photo as capturedImage for backward compat
    if (capturedPhotos.length > 0) {
      setCapturedImage(capturedPhotos[0]);
    }
    if (mode === 'solo') {
      goTo(PAGES.PUZZLE);
    } else {
      goTo(PAGES.EDITOR);
    }
  };

  const handleDonate = () => {
    goTo(PAGES.DONATE);
  };

  const getStepCount = () => {
    if (mode === 'room') return 4; // Room → Camera → Editor → Donate
    return 6; // Landing → Config → Camera → Puzzle → Editor → Donate
  };

  const renderPage = () => {
    switch (currentPage) {
      case PAGES.LANDING:
        return <LandingPage onModeSelect={handleModeSelect} />;
      case PAGES.CONFIG:
        return (
          <ConfigPage
            gridSize={gridSize}
            onSelectGrid={setGridSize}
            onNext={() => goTo(PAGES.CAMERA)}
          />
        );
      case PAGES.ROOM:
        return (
          <RoomPage
            onRoomReady={handleRoomReady}
            onBack={() => { setMode(null); goTo(PAGES.LANDING); }}
          />
        );
      case PAGES.CAMERA:
        return (
          <CameraPage
            mode={mode}
            maxPhotos={mode === 'room' ? 4 : 4}
            onPhotosCapture={handlePhotosCapture}
            peerRoom={peerRoomRef.current}
            peerPhotos={peerPhotos}
          />
        );
      case PAGES.PUZZLE:
        return (
          <PuzzlePage
            imageSrc={capturedImage}
            gridSize={gridSize}
            onComplete={() => goTo(PAGES.EDITOR)}
          />
        );
      case PAGES.EDITOR:
        return (
          <EditorPage
            imageSrc={capturedImage}
            photos={photos}
            peerPhotos={peerPhotos}
            mode={mode}
            onRestart={handleRestart}
            onDonate={handleDonate}
          />
        );
      case PAGES.DONATE:
        return <DonatePage onDone={handleRestart} />;
      default:
        return <LandingPage onModeSelect={handleModeSelect} />;
    }
  };

  return (
    <>
      {currentPage !== PAGES.LANDING && currentPage !== PAGES.DONATE && (
        <Header
          currentStep={PAGE_INDEX[currentPage]}
          totalSteps={getStepCount()}
          onBack={() => {
            const pages = Object.values(PAGES);
            const idx = pages.indexOf(currentPage);
            if (idx > 0) goTo(pages[idx - 1]);
          }}
          showBack={currentPage !== PAGES.LANDING}
        />
      )}
      <main>{renderPage()}</main>
    </>
  );
}
