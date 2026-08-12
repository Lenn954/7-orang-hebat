import '../styles/ConfigPage.css';

export default function ConfigPage({ gridSize, onSelectGrid, onNext }) {
  const options = [
    { size: 3, label: '3 × 3', desc: '9 pieces — Easy', cells: 9 },
    { size: 4, label: '4 × 4', desc: '16 pieces — Challenge', cells: 16 },
  ];

  return (
    <section className="config">
      <h2 className="config-title">Choose Your Puzzle</h2>
      <p className="config-subtitle">Select the grid size for your photo puzzle</p>

      <div className="config-grid-options">
        {options.map((opt) => (
          <button
            key={opt.size}
            className={`config-card ${gridSize === opt.size ? 'selected' : ''}`}
            onClick={() => onSelectGrid(opt.size)}
            id={`grid-option-${opt.size}`}
          >
            <div className="config-card-check">✓</div>
            <div className={`config-grid-preview grid-${opt.size}`}>
              {Array.from({ length: opt.cells }, (_, i) => (
                <div key={i} className="config-grid-cell" />
              ))}
            </div>
            <div className="config-card-label">{opt.label}</div>
            <div className="config-card-desc">{opt.desc}</div>
          </button>
        ))}
      </div>

      <button className="config-next-btn" onClick={onNext} id="btn-open-camera">
        Open Camera →
      </button>
    </section>
  );
}
