import { useState, useRef, useCallback } from 'react';
import { renderEditedPhoto, downloadBlob } from '../utils/canvasUtils';
import '../styles/EditorPage.css';

const FRAMES = [
  { type: null, label: 'None', icon: '⬜' },
  { type: 'polaroid', label: 'Polaroid', icon: '🖼️' },
  { type: 'vintage', label: 'Vintage', icon: '📜' },
  { type: 'floral', label: 'Floral', icon: '🌸' },
  { type: 'minimal', label: 'Minimal', icon: '▪️' },
  { type: 'scrapbook', label: 'Scrapbook', icon: '📌' },
];

const FILTERS = [
  { name: 'none', label: 'Original' },
  { name: 'sepia', label: 'Sepia' },
  { name: 'bw', label: 'B & W' },
  { name: 'vintage', label: 'Vintage' },
  { name: 'cool', label: 'Cool' },
  { name: 'dreamy', label: 'Dreamy' },
];

const STICKER_PALETTE = ['❤️', '⭐', '🌸', '🎀', '✨', '🦋', '💬', '📌', '🌈', '💖', '🍀', '🎵'];

const FONT_OPTIONS = ['Inter', 'Playfair Display', 'Georgia', 'Courier New'];

export default function EditorPage({ imageSrc, onRestart }) {
  const [activeTab, setActiveTab] = useState('frames');
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [stickers, setStickers] = useState([]);
  const [texts, setTexts] = useState([]);
  const [downloading, setDownloading] = useState(false);

  // Text input state
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#2D2D2D');
  const [textFont, setTextFont] = useState('Inter');
  const [textSize, setTextSize] = useState(24);

  const canvasContainerRef = useRef(null);
  const dragRef = useRef({ type: null, id: null, offsetX: 0, offsetY: 0 });

  const getFrameClass = () => {
    if (!selectedFrame) return '';
    return `frame-${selectedFrame}`;
  };

  const getFilterClass = () => {
    if (selectedFilter === 'none') return '';
    return `filter-${selectedFilter}`;
  };

  // Add sticker
  const addSticker = (emoji) => {
    setStickers((prev) => [
      ...prev,
      { id: Date.now(), emoji, x: 50 + Math.random() * 40, y: 50 + Math.random() * 40, size: 40 },
    ]);
  };

  const removeSticker = (id) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };

  // Add text
  const addText = () => {
    if (!textInput.trim()) return;
    setTexts((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: textInput,
        x: 50 + Math.random() * 30,
        y: 50 + Math.random() * 30,
        fontSize: textSize,
        color: textColor,
        fontFamily: textFont,
        bold: false,
        italic: false,
      },
    ]);
    setTextInput('');
  };

  const removeText = (id) => {
    setTexts((prev) => prev.filter((t) => t.id !== id));
  };

  // Drag stickers & texts
  const handlePointerDown = useCallback((e, type, id) => {
    e.preventDefault();
    const container = canvasContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const items = type === 'sticker' ? stickers : texts;
    const item = items.find((i) => i.id === id);
    if (!item) return;

    dragRef.current = {
      type,
      id,
      offsetX: clientX - rect.left - item.x,
      offsetY: clientY - rect.top - item.y,
    };

    const onMove = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const newX = cx - rect.left - dragRef.current.offsetX;
      const newY = cy - rect.top - dragRef.current.offsetY;

      if (dragRef.current.type === 'sticker') {
        setStickers((prev) =>
          prev.map((s) => (s.id === dragRef.current.id ? { ...s, x: newX, y: newY } : s))
        );
      } else {
        setTexts((prev) =>
          prev.map((t) => (t.id === dragRef.current.id ? { ...t, x: newX, y: newY } : t))
        );
      }
    };

    const onUp = () => {
      dragRef.current = { type: null, id: null, offsetX: 0, offsetY: 0 };
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [stickers, texts]);

  // Download
  const handleDownload = async () => {
    if (!canvasContainerRef.current) return;
    setDownloading(true);
    try {
      const container = canvasContainerRef.current;
      const blob = await renderEditedPhoto({
        imageSrc,
        filter: selectedFilter,
        frame: selectedFrame ? { type: selectedFrame } : null,
        stickers,
        texts,
        canvasWidth: container.offsetWidth,
        canvasHeight: container.offsetHeight,
      });
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      downloadBlob(blob, `scrapbook-puzzle-${timestamp}.png`);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Please try again.');
    }
    setDownloading(false);
  };

  const tabs = [
    { id: 'frames', icon: '🖼️', label: 'Frames' },
    { id: 'stickers', icon: '🌟', label: 'Stickers' },
    { id: 'text', icon: '✏️', label: 'Text' },
    { id: 'filters', icon: '🎨', label: 'Filters' },
  ];

  return (
    <section className="editor">
      <h2 className="editor-title">Edit Your Photo ✨</h2>

      <div className="editor-workspace">
        {/* Canvas area */}
        <div className="editor-canvas-container" ref={canvasContainerRef}>
          <img
            src={imageSrc}
            alt="Your photo"
            className={`editor-canvas-img ${getFilterClass()}`}
          />

          {/* Frame overlay */}
          {selectedFrame && (
            <div className={`editor-frame-overlay ${getFrameClass()}`} />
          )}

          {/* Stickers */}
          {stickers.map((sticker) => (
            <div
              key={sticker.id}
              className="editor-sticker"
              style={{
                left: `${sticker.x}px`,
                top: `${sticker.y}px`,
                fontSize: `${sticker.size}px`,
              }}
              onMouseDown={(e) => handlePointerDown(e, 'sticker', sticker.id)}
              onTouchStart={(e) => handlePointerDown(e, 'sticker', sticker.id)}
            >
              {sticker.emoji}
              <button
                className="editor-sticker-delete"
                onClick={(e) => { e.stopPropagation(); removeSticker(sticker.id); }}
              >
                ×
              </button>
            </div>
          ))}

          {/* Texts */}
          {texts.map((t) => (
            <div
              key={t.id}
              className="editor-text-overlay"
              style={{
                left: `${t.x}px`,
                top: `${t.y}px`,
                fontSize: `${t.fontSize}px`,
                color: t.color,
                fontFamily: t.fontFamily,
                fontWeight: t.bold ? 'bold' : 'normal',
                fontStyle: t.italic ? 'italic' : 'normal',
              }}
              onMouseDown={(e) => handlePointerDown(e, 'text', t.id)}
              onTouchStart={(e) => handlePointerDown(e, 'text', t.id)}
            >
              {t.text}
              <button
                className="editor-text-delete"
                onClick={(e) => { e.stopPropagation(); removeText(t.id); }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="editor-toolbar">
          <div className="editor-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`editor-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="editor-tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="editor-panel">
            {activeTab === 'frames' && (
              <div className="editor-frame-options">
                {FRAMES.map((f) => (
                  <button
                    key={f.label}
                    className={`editor-frame-option ${selectedFrame === f.type ? 'active' : ''}`}
                    onClick={() => setSelectedFrame(f.type)}
                  >
                    <div className="editor-frame-option-icon">{f.icon}</div>
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'stickers' && (
              <div className="editor-sticker-palette">
                {STICKER_PALETTE.map((emoji, i) => (
                  <button
                    key={i}
                    className="editor-sticker-btn"
                    onClick={() => addSticker(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'text' && (
              <div className="editor-text-panel">
                <input
                  type="text"
                  className="editor-text-input"
                  placeholder="Type your text..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addText()}
                />
                <div className="editor-text-row">
                  <label>Font</label>
                  <select
                    className="editor-text-input"
                    value={textFont}
                    onChange={(e) => setTextFont(e.target.value)}
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="editor-text-row">
                  <label>Size</label>
                  <input
                    type="range"
                    min="12"
                    max="72"
                    value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '0.8rem', minWidth: 30 }}>{textSize}</span>
                </div>
                <div className="editor-text-row">
                  <label>Color</label>
                  <input
                    type="color"
                    className="editor-text-color-input"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                  />
                </div>
                <button className="editor-add-text-btn" onClick={addText}>
                  Add Text
                </button>
              </div>
            )}

            {activeTab === 'filters' && (
              <div className="editor-filter-options">
                {FILTERS.map((f) => (
                  <button
                    key={f.name}
                    className={`editor-filter-option ${selectedFilter === f.name ? 'active' : ''}`}
                    onClick={() => setSelectedFilter(f.name)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="editor-actions">
        <button className="editor-action-btn editor-restart-btn" onClick={onRestart}>
          ↺ Start Over
        </button>
        <button
          className="editor-action-btn editor-download-btn"
          onClick={handleDownload}
          disabled={downloading}
          id="btn-download"
        >
          {downloading ? '⏳ Exporting...' : '📥 Download Photo'}
        </button>
      </div>
    </section>
  );
}
