import '../styles/LandingPage.css';

export default function LandingPage({ onModeSelect }) {
  return (
    <section className="landing">
      {/* Decorative tape elements */}
      <div className="landing-tape landing-tape-1" />
      <div className="landing-tape landing-tape-2" />
      <div className="landing-tape landing-tape-3" />

      <div className="landing-badge">✨ Photo Puzzle Experience</div>

      <h1 className="landing-title">
        Scrapbook<br />
        <span className="landing-title-accent">Puzzle!</span>
      </h1>

      <p className="landing-subtitle">
        Capture your moment, solve the puzzle, and create beautiful
        photobooth memories you can download and share.
      </p>

      <div className="landing-mode-selection">
        <button
          className="landing-mode-card"
          onClick={() => onModeSelect('solo')}
          id="btn-solo"
        >
          <div className="landing-mode-icon">📷</div>
          <h3 className="landing-mode-title">Solo Mode</h3>
          <p className="landing-mode-desc">
            Foto sendiri, selesaikan puzzle, edit & download
          </p>
          <span className="landing-mode-arrow">→</span>
        </button>

        <div className="landing-mode-divider">
          <span>atau</span>
        </div>

        <button
          className="landing-mode-card landing-mode-card-room"
          onClick={() => onModeSelect('room')}
          id="btn-room"
        >
          <div className="landing-mode-icon">👥</div>
          <h3 className="landing-mode-title">Room Mode</h3>
          <p className="landing-mode-desc">
            Foto bareng teman dari jarak jauh via Room ID
          </p>
          <span className="landing-mode-badge-new">NEW</span>
          <span className="landing-mode-arrow">→</span>
        </button>
      </div>

      <div className="landing-features">
        <div className="landing-feature">
          <div className="landing-feature-icon">📸</div>
          <span className="landing-feature-label">Multi-Photo</span>
        </div>
        <div className="landing-feature">
          <div className="landing-feature-icon">🧩</div>
          <span className="landing-feature-label">Puzzle</span>
        </div>
        <div className="landing-feature">
          <div className="landing-feature-icon">🎨</div>
          <span className="landing-feature-label">Edit</span>
        </div>
        <div className="landing-feature">
          <div className="landing-feature-icon">👥</div>
          <span className="landing-feature-label">Multiplayer</span>
        </div>
      </div>
    </section>
  );
}
