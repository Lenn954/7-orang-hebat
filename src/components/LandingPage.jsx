import '../styles/LandingPage.css';

export default function LandingPage({ onStart }) {
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

      <button className="landing-cta" onClick={onStart} id="btn-start">
        START CREATING
        <span className="landing-cta-icon">📷</span>
      </button>

      <div className="landing-features">
        <div className="landing-feature">
          <div className="landing-feature-icon">📸</div>
          <span className="landing-feature-label">Capture</span>
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
          <div className="landing-feature-icon">📥</div>
          <span className="landing-feature-label">Download</span>
        </div>
      </div>
    </section>
  );
}
