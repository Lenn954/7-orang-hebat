import { useState } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import ConfigPage from './components/ConfigPage';
import CameraPage from './components/CameraPage';
import PuzzlePage from './components/PuzzlePage';
import EditorPage from './components/EditorPage';

const PAGES = {
  LANDING: 'landing',
  CONFIG: 'config',
  CAMERA: 'camera',
  PUZZLE: 'puzzle',
  EDITOR: 'editor',
};

const PAGE_INDEX = {
  [PAGES.LANDING]: 0,
  [PAGES.CONFIG]: 1,
  [PAGES.CAMERA]: 2,
  [PAGES.PUZZLE]: 3,
  [PAGES.EDITOR]: 4,
};

export default function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.LANDING);
  const [gridSize, setGridSize] = useState(3);
  const [capturedImage, setCapturedImage] = useState(null);

  const goTo = (page) => setCurrentPage(page);

  const handleRestart = () => {
    setCapturedImage(null);
    setGridSize(3);
    setCurrentPage(PAGES.LANDING);
  };

  const renderPage = () => {
    switch (currentPage) {
      case PAGES.LANDING:
        return <LandingPage onStart={() => goTo(PAGES.CONFIG)} />;
      case PAGES.CONFIG:
        return (
          <ConfigPage
            gridSize={gridSize}
            onSelectGrid={setGridSize}
            onNext={() => goTo(PAGES.CAMERA)}
          />
        );
      case PAGES.CAMERA:
        return (
          <CameraPage
            onCapture={(img) => {
              setCapturedImage(img);
              goTo(PAGES.PUZZLE);
            }}
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
            onRestart={handleRestart}
          />
        );
      default:
        return <LandingPage onStart={() => goTo(PAGES.CONFIG)} />;
    }
  };

  return (
    <>
      {currentPage !== PAGES.LANDING && (
        <Header
          currentStep={PAGE_INDEX[currentPage]}
          totalSteps={5}
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
