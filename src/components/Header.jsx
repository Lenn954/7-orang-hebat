import '../styles/Header.css';

export default function Header({ currentStep, totalSteps, onBack, showBack }) {
  return (
    <header className="header">
      <div className="header-logo">
        <span className="header-logo-icon">📷</span>
        Scrapbook Puzzle
      </div>

      <div className="header-steps">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`header-step ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
          />
        ))}
      </div>

      {showBack && (
        <button className="header-back-btn" onClick={onBack}>
          ← Back
        </button>
      )}
    </header>
  );
}
