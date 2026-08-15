import '../styles/DonatePage.css';

export default function DonatePage({ onDone }) {
  return (
    <section className="donate">
      <div className="donate-sparkles">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="donate-sparkle"
            style={{
              left: `${15 + Math.random() * 70}%`,
              top: `${15 + Math.random() * 70}%`,
              animationDelay: `${Math.random() * 3}s`,
              fontSize: `${12 + Math.random() * 10}px`,
            }}
          >
            ✨
          </div>
        ))}
      </div>

      <div className="donate-card">
        <div className="donate-emoji">💝</div>
        <h2 className="donate-title">Terima Kasih!</h2>
        <p className="donate-subtitle">
          Senang bisa jadi bagian dari momen spesial kamu! ✨
        </p>

        <div className="donate-qr-container">
          <div className="donate-qr-frame">
            <div className="donate-qr-placeholder">
              <span className="donate-qr-text">QR CODE</span>
              <span className="donate-qr-subtext">Ganti dengan QR asli</span>
            </div>
          </div>
          <p className="donate-qr-label">Scan untuk Donate</p>
        </div>

        <p className="donate-message">
          Jika kamu menikmati pengalaman ini, pertimbangkan untuk mendukung kami! 🚀
        </p>

        <div className="donate-actions">
          <button className="donate-done-btn" onClick={onDone} id="btn-done">
            Selesai ✨
          </button>
        </div>
      </div>
    </section>
  );
}
