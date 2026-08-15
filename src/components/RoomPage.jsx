import { useState, useEffect, useRef } from 'react';
import PeerRoom from '../utils/peerService';
import '../styles/RoomPage.css';

export default function RoomPage({ onRoomReady, onBack }) {
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | error
  const [errorMsg, setErrorMsg] = useState('');
  const [peers, setPeers] = useState([]);
  const [copied, setCopied] = useState(false);
  const peerRoomRef = useRef(null);

  useEffect(() => {
    return () => {
      if (peerRoomRef.current) {
        peerRoomRef.current.destroy();
      }
    };
  }, []);

  const setupListeners = (room) => {
    room.on('statusChange', (s) => setStatus(s));
    room.on('error', (msg) => setErrorMsg(msg));
    room.on('peerJoined', () => {
      setPeers(room.getAllPeers());
    });
    room.on('peerLeft', () => {
      setPeers(room.getAllPeers());
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const room = new PeerRoom();
    peerRoomRef.current = room;
    setupListeners(room);
    setStatus('connecting');
    setErrorMsg('');
    try {
      const id = await room.createRoom(name.trim());
      setRoomId(id);
      setPeers(room.getAllPeers());
      setStatus('connected');
    } catch {
      setStatus('error');
    }
  };

  const handleJoin = async () => {
    if (!name.trim() || !joinCode.trim()) return;
    const room = new PeerRoom();
    peerRoomRef.current = room;
    setupListeners(room);
    setStatus('connecting');
    setErrorMsg('');
    try {
      await room.joinRoom(joinCode.trim(), name.trim());
      setRoomId(joinCode.trim().toUpperCase());
      setPeers(room.getAllPeers());
      setStatus('connected');
    } catch {
      setStatus('error');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStart = () => {
    if (peerRoomRef.current) {
      onRoomReady(peerRoomRef.current);
    }
  };

  // Mode selection
  if (!mode) {
    return (
      <section className="room">
        <h2 className="room-title">Room Photobooth 🎉</h2>
        <p className="room-subtitle">Foto bareng teman dari jarak jauh! (masih tahap pengembangan)</p>

        <div className="room-mode-cards">
          <button className="room-mode-card" onClick={() => setMode('create')}>
            <div className="room-mode-icon">🏠</div>
            <h3>Buat Room</h3>
            <p>Buat room baru dan bagikan kode ke teman</p>
          </button>
          <button className="room-mode-card" onClick={() => setMode('join')}>
            <div className="room-mode-icon">🔗</div>
            <h3>Join Room</h3>
            <p>Masuk ke room teman dengan kode</p>
          </button>
        </div>

        <button className="room-back-btn" onClick={onBack}>← Kembali</button>
      </section>
    );
  }

  // Connected state — show room info
  if (status === 'connected') {
    return (
      <section className="room">
        <div className="room-connected-badge">
          <span className="room-status-dot connected" />
          Connected
        </div>

        <h2 className="room-title">Room Ready! 🎊</h2>

        <div className="room-id-display">
          <span className="room-id-label">Room Code</span>
          <div className="room-id-code">{roomId}</div>
          <button className="room-copy-btn" onClick={handleCopy}>
            {copied ? '✅ Copied!' : '📋 Copy Code'}
          </button>
        </div>

        <div className="room-peers">
          <h3 className="room-peers-title">Peserta ({peers.length})</h3>
          <div className="room-peers-list">
            {peers.map((p) => (
              <div key={p.peerId} className={`room-peer-item ${p.isSelf ? 'self' : ''}`}>
                <div className="room-peer-avatar">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="room-peer-name">{p.name}</span>
                {p.isSelf && <span className="room-peer-badge">You</span>}
              </div>
            ))}
          </div>
        </div>

        {(peerRoomRef.current?.isHost || !peerRoomRef.current?.isHost) && (
          <button className="room-start-btn" onClick={handleStart}>
            Mulai Foto! 📸
          </button>
        )}
      </section>
    );
  }

  // Create / Join form
  return (
    <section className="room">
      <h2 className="room-title">
        {mode === 'create' ? 'Buat Room Baru 🏠' : 'Join Room 🔗'}
      </h2>
      <p className="room-subtitle">
        {mode === 'create'
          ? 'Masukkan nama kamu untuk membuat room'
          : 'Masukkan nama dan kode room untuk bergabung'}
      </p>

      <div className="room-form">
        <div className="room-form-group">
          <label className="room-form-label">Nama Kamu</label>
          <input
            type="text"
            className="room-form-input"
            placeholder="Masukkan nama..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
          />
        </div>

        {mode === 'join' && (
          <div className="room-form-group">
            <label className="room-form-label">Kode Room</label>
            <input
              type="text"
              className="room-form-input room-code-input"
              placeholder="ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
          </div>
        )}

        {errorMsg && (
          <div className="room-error">{errorMsg}</div>
        )}

        <button
          className="room-submit-btn"
          onClick={mode === 'create' ? handleCreate : handleJoin}
          disabled={status === 'connecting' || !name.trim() || (mode === 'join' && !joinCode.trim())}
        >
          {status === 'connecting' ? (
            <>
              <div className="room-spinner" />
              Connecting...
            </>
          ) : (
            mode === 'create' ? '🚀 Buat Room' : '🔗 Join Room'
          )}
        </button>
      </div>

      <button className="room-back-btn" onClick={() => { setMode(null); setStatus('idle'); setErrorMsg(''); }}>
        ← Kembali
      </button>
    </section>
  );
}
