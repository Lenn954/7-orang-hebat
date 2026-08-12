import { useState, useEffect, useRef, useCallback } from 'react';
import { sliceImage, shuffleArray, isPuzzleComplete } from '../utils/puzzleUtils';
import '../styles/PuzzlePage.css';

const CONFETTI_COLORS = ['#C4956A', '#E8B4B8', '#7CB68E', '#D4AD85', '#F0CDD0', '#FFD700'];

export default function PuzzlePage({ imageSrc, gridSize, onComplete }) {
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [confetti, setConfetti] = useState([]);
  const touchRef = useRef({ startIndex: null });

  const totalPieces = gridSize * gridSize;

  useEffect(() => {
    if (!imageSrc) return;
    setLoading(true);
    sliceImage(imageSrc, gridSize).then((sliced) => {
      const shuffled = shuffleArray(sliced);
      setPieces(shuffled);
      setLoading(false);
    });
  }, [imageSrc, gridSize]);

  useEffect(() => {
    const count = pieces.filter((p, i) => p.correctIndex === i).length;
    setCorrectCount(count);
    if (pieces.length > 0 && isPuzzleComplete(pieces)) {
      setTimeout(() => {
        setCompleted(true);
        spawnConfetti();
      }, 400);
    }
  }, [pieces]);

  const spawnConfetti = () => {
    const items = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 2,
      size: 6 + Math.random() * 8,
    }));
    setConfetti(items);
  };

  const swapPieces = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    setPieces((prev) => {
      const next = [...prev];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  }, []);

  // Drag & Drop handlers (HTML5)
  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => setDragOverIndex(null);

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    swapPieces(fromIndex, toIndex);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Touch handlers for mobile
  const handleTouchStart = (index) => {
    touchRef.current.startIndex = index;
    setDragIndex(index);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    if (elem) {
      const pieceElem = elem.closest('[data-piece-index]');
      if (pieceElem) {
        const idx = parseInt(pieceElem.dataset.pieceIndex, 10);
        setDragOverIndex(idx);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchRef.current.startIndex !== null && dragOverIndex !== null) {
      swapPieces(touchRef.current.startIndex, dragOverIndex);
    }
    touchRef.current.startIndex = null;
    setDragIndex(null);
    setDragOverIndex(null);
  };

  if (loading) {
    return (
      <section className="puzzle">
        <div className="puzzle-header">
          <h2 className="puzzle-title">Preparing Your Puzzle...</h2>
          <p className="puzzle-subtitle">Slicing your photo into {totalPieces} pieces</p>
        </div>
      </section>
    );
  }

  return (
    <section className="puzzle">
      <div className="puzzle-header">
        <h2 className="puzzle-title">Solve the Puzzle 🧩</h2>
        <p className="puzzle-subtitle">Drag and drop pieces to their correct positions</p>
      </div>

      <div className="puzzle-progress">
        <span>🧩 {correctCount} / {totalPieces}</span>
        <div className="puzzle-progress-bar">
          <div
            className="puzzle-progress-fill"
            style={{ width: `${(correctCount / totalPieces) * 100}%` }}
          />
        </div>
      </div>

      <div className={`puzzle-board grid-${gridSize}`}>
        {pieces.map((piece, index) => {
          const isCorrect = piece.correctIndex === index;
          return (
            <div
              key={piece.id}
              data-piece-index={index}
              className={`puzzle-piece ${dragIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''} ${isCorrect ? 'correct' : ''}`}
              draggable={!isCorrect}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={() => handleTouchStart(index)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img src={piece.dataUrl} alt={`Puzzle piece ${piece.id + 1}`} />
            </div>
          );
        })}
      </div>

      {completed && (
        <>
          {confetti.map((c) => (
            <div
              key={c.id}
              className="confetti-piece"
              style={{
                left: `${c.left}%`,
                top: '-20px',
                backgroundColor: c.color,
                width: `${c.size}px`,
                height: `${c.size}px`,
                animationDelay: `${c.delay}s`,
              }}
            />
          ))}
          <div className="puzzle-complete-overlay">
            <div className="puzzle-complete-card">
              <div className="puzzle-complete-emoji">🎉</div>
              <h2 className="puzzle-complete-title">Puzzle Complete!</h2>
              <p className="puzzle-complete-text">
                Amazing! Now let's make your photo even more beautiful.
              </p>
              <button className="puzzle-complete-btn" onClick={onComplete} id="btn-to-editor">
                Edit Photo ✨
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
