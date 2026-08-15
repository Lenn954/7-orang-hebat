/**
 * peerService.js
 * WebRTC peer-to-peer room system using PeerJS.
 * Supports both data channels (text/photos) and media streams (live video).
 * Privacy: No data is stored server-side. PeerJS Cloud only handles signaling metadata.
 */

import Peer from 'peerjs';

const ROOM_PREFIX = 'scrapbook-puzzle-';
const MAX_PEERS = 4;

/**
 * Generate a random 6-character room code
 */
function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * PeerRoom — manages a WebRTC room session with video + data
 */
export class PeerRoom {
  constructor() {
    this.peer = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.mediaCalls = new Map(); // peerId -> MediaConnection
    this.remoteStreams = new Map(); // peerId -> MediaStream
    this.localStream = null;
    this.isHost = false;
    this.roomId = null;
    this.myName = '';
    this.peers = new Map(); // peerId -> { name, photos }
    this._listeners = {
      peerJoined: [],
      peerLeft: [],
      photoReceived: [],
      statusChange: [],
      error: [],
      streamReceived: [],
      streamRemoved: [],
      countdownTick: [],
      captureSignal: [],
      capturedPhoto: [],
    };
    this._status = 'disconnected';
  }

  get status() { return this._status; }
  set status(val) {
    this._status = val;
    this._emit('statusChange', val);
  }

  /**
   * Create a new room as host
   * @param {string} name - Display name
   * @returns {Promise<string>} Room ID
   */
  async createRoom(name) {
    this.myName = name;
    this.isHost = true;
    this.roomId = generateRoomId();
    const peerId = ROOM_PREFIX + this.roomId;

    return new Promise((resolve, reject) => {
      this.status = 'connecting';
      this.peer = new Peer(peerId);

      this.peer.on('open', () => {
        this.status = 'connected';
        // Listen for incoming data connections
        this.peer.on('connection', (conn) => this._handleIncomingConnection(conn));
        // Listen for incoming media calls
        this.peer.on('call', (call) => this._handleIncomingCall(call));
        resolve(this.roomId);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        if (err.type === 'unavailable-id') {
          this.roomId = generateRoomId();
          this.peer.destroy();
          this.createRoom(name).then(resolve).catch(reject);
        } else {
          this.status = 'error';
          this._emit('error', err.message || 'Connection error');
          reject(err);
        }
      });

      this.peer.on('disconnected', () => {
        this.status = 'disconnected';
      });
    });
  }

  /**
   * Join an existing room
   * @param {string} roomId - Room ID to join
   * @param {string} name - Display name
   * @returns {Promise<void>}
   */
  async joinRoom(roomId, name) {
    this.myName = name;
    this.isHost = false;
    this.roomId = roomId.toUpperCase();

    return new Promise((resolve, reject) => {
      this.status = 'connecting';
      this.peer = new Peer();

      this.peer.on('open', () => {
        const hostId = ROOM_PREFIX + this.roomId;
        const conn = this.peer.connect(hostId, {
          metadata: { name: this.myName },
          reliable: true,
        });

        conn.on('open', () => {
          this.status = 'connected';
          this._setupConnection(conn, 'Host');
          conn.send({ type: 'introduce', name: this.myName });
          resolve();
        });

        conn.on('error', (err) => {
          this.status = 'error';
          this._emit('error', 'Failed to connect to room');
          reject(err);
        });

        // Listen for incoming connections (mesh)
        this.peer.on('connection', (inConn) => this._handleIncomingConnection(inConn));
        // Listen for incoming media calls
        this.peer.on('call', (call) => this._handleIncomingCall(call));

        // Timeout
        setTimeout(() => {
          if (this.status === 'connecting') {
            this.status = 'error';
            this._emit('error', 'Connection timed out. Room may not exist.');
            reject(new Error('Timeout'));
          }
        }, 10000);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        this.status = 'error';
        this._emit('error', err.message || 'Connection error');
        reject(err);
      });
    });
  }

  /**
   * Start video streaming to all connected peers
   * @param {MediaStream} localStream - The local camera stream
   */
  startVideoCall(localStream) {
    this.localStream = localStream;

    // Call all existing peers
    this.connections.forEach((conn, peerId) => {
      this._callPeer(peerId, localStream);
    });
  }

  /**
   * Call a specific peer with our local video stream
   */
  _callPeer(peerId, stream) {
    if (!this.peer || this.mediaCalls.has(peerId)) return;

    const call = this.peer.call(peerId, stream, {
      metadata: { name: this.myName },
    });

    if (!call) return;

    this.mediaCalls.set(peerId, call);

    call.on('stream', (remoteStream) => {
      this.remoteStreams.set(peerId, remoteStream);
      const peerData = this.peers.get(peerId);
      this._emit('streamReceived', {
        peerId,
        stream: remoteStream,
        name: peerData?.name || 'Unknown',
      });
    });

    call.on('close', () => {
      this.mediaCalls.delete(peerId);
      this.remoteStreams.delete(peerId);
      const peerData = this.peers.get(peerId);
      this._emit('streamRemoved', { peerId, name: peerData?.name || 'Unknown' });
    });

    call.on('error', (err) => {
      console.error(`Media call error with ${peerId}:`, err);
    });
  }

  /**
   * Handle an incoming media call
   */
  _handleIncomingCall(call) {
    const peerId = call.peer;
    const callerName = call.metadata?.name || 'Unknown';

    // Answer with our local stream if available
    if (this.localStream) {
      call.answer(this.localStream);
    } else {
      call.answer(); // Answer without stream (will receive theirs)
    }

    this.mediaCalls.set(peerId, call);

    call.on('stream', (remoteStream) => {
      this.remoteStreams.set(peerId, remoteStream);
      const peerData = this.peers.get(peerId);
      this._emit('streamReceived', {
        peerId,
        stream: remoteStream,
        name: peerData?.name || callerName,
      });
    });

    call.on('close', () => {
      this.mediaCalls.delete(peerId);
      this.remoteStreams.delete(peerId);
      this._emit('streamRemoved', { peerId, name: callerName });
    });

    call.on('error', (err) => {
      console.error(`Incoming call error from ${callerName}:`, err);
    });
  }

  /**
   * Handle an incoming peer data connection
   */
  _handleIncomingConnection(conn) {
    const peerName = conn.metadata?.name || 'Unknown';
    conn.on('open', () => {
      this._setupConnection(conn, peerName);
      if (this.isHost) {
        this._broadcastPeerList();
      }
      // If we already have a video stream, call this new peer
      if (this.localStream) {
        setTimeout(() => this._callPeer(conn.peer, this.localStream), 500);
      }
    });
  }

  /**
   * Setup a data connection with event handlers
   */
  _setupConnection(conn, name) {
    const peerId = conn.peer;
    this.connections.set(peerId, conn);
    this.peers.set(peerId, { name, photos: [] });
    this._emit('peerJoined', { peerId, name });

    conn.on('data', (data) => {
      this._handleMessage(peerId, data);
    });

    conn.on('close', () => {
      this.connections.delete(peerId);
      this.peers.delete(peerId);
      this.remoteStreams.delete(peerId);
      this.mediaCalls.delete(peerId);
      this._emit('peerLeft', { peerId, name });
      this._emit('streamRemoved', { peerId, name });
      if (this.isHost) {
        this._broadcastPeerList();
      }
    });

    conn.on('error', (err) => {
      console.error(`Connection error with ${name}:`, err);
    });
  }

  /**
   * Handle incoming data messages
   */
  _handleMessage(fromPeerId, data) {
    switch (data.type) {
      case 'introduce': {
        const peer = this.peers.get(fromPeerId);
        if (peer) {
          peer.name = data.name;
          this._emit('peerJoined', { peerId: fromPeerId, name: data.name });
        }
        break;
      }
      case 'photo': {
        const peer = this.peers.get(fromPeerId);
        if (peer) {
          peer.photos.push(data.imageData);
          this._emit('photoReceived', {
            peerId: fromPeerId,
            name: peer.name,
            imageData: data.imageData,
            photoIndex: data.photoIndex,
          });
        }
        if (this.isHost) {
          // Relay to other peers
          this.connections.forEach((conn, connPeerId) => {
            if (connPeerId !== fromPeerId) {
              try { conn.send(data); } catch {}
            }
          });
        }
        break;
      }
      case 'countdown': {
        this._emit('countdownTick', { count: data.count, fromPeerId });
        // Relay if host
        if (this.isHost) {
          this.connections.forEach((conn, connPeerId) => {
            if (connPeerId !== fromPeerId) {
              try { conn.send(data); } catch {}
            }
          });
        }
        break;
      }
      case 'captureNow': {
        this._emit('captureSignal', { fromPeerId });
        if (this.isHost) {
          this.connections.forEach((conn, connPeerId) => {
            if (connPeerId !== fromPeerId) {
              try { conn.send(data); } catch {}
            }
          });
        }
        break;
      }
      case 'capturedPhoto': {
        this._emit('capturedPhoto', {
          peerId: fromPeerId,
          name: this.peers.get(fromPeerId)?.name || 'Unknown',
          imageData: data.imageData,
          roundIndex: data.roundIndex,
        });
        if (this.isHost) {
          this.connections.forEach((conn, connPeerId) => {
            if (connPeerId !== fromPeerId) {
              try { conn.send(data); } catch {}
            }
          });
        }
        break;
      }
      case 'peerList': {
        if (!this.isHost && data.peers) {
          data.peers.forEach((p) => {
            if (!this.peers.has(p.peerId) && p.peerId !== this.peer?.id) {
              this.peers.set(p.peerId, { name: p.name, photos: [] });
              this._emit('peerJoined', { peerId: p.peerId, name: p.name });
            }
          });
        }
        break;
      }
      default:
        break;
    }
  }

  /**
   * Host broadcasts countdown to all peers
   * @param {number} count - Current countdown number
   */
  broadcastCountdown(count) {
    const msg = { type: 'countdown', count };
    this.connections.forEach((conn) => {
      try { conn.send(msg); } catch {}
    });
  }

  /**
   * Host broadcasts capture signal
   */
  broadcastCaptureSignal() {
    const msg = { type: 'captureNow' };
    this.connections.forEach((conn) => {
      try { conn.send(msg); } catch {}
    });
  }

  /**
   * Send captured photo to all peers
   * @param {string} imageData - Base64 data URL
   * @param {number} roundIndex - Which capture round (0-3)
   */
  sendCapturedPhoto(imageData, roundIndex = 0) {
    const msg = { type: 'capturedPhoto', imageData, roundIndex };
    this.connections.forEach((conn) => {
      try { conn.send(msg); } catch {}
    });
  }

  /**
   * Broadcast photo to all connected peers (legacy)
   */
  broadcastPhoto(imageData, photoIndex = 0) {
    const message = { type: 'photo', imageData, photoIndex, senderName: this.myName };
    this.connections.forEach((conn) => {
      try { conn.send(message); } catch {}
    });
  }

  /**
   * Host broadcasts updated peer list
   */
  _broadcastPeerList() {
    const peerList = [];
    this.peers.forEach((data, peerId) => {
      peerList.push({ peerId, name: data.name });
    });
    peerList.push({ peerId: this.peer?.id, name: this.myName + ' (Host)' });
    const message = { type: 'peerList', peers: peerList };
    this.connections.forEach((conn) => {
      try { conn.send(message); } catch {}
    });
  }

  /**
   * Get all peers including self
   */
  getAllPeers() {
    const list = [{ peerId: 'self', name: this.myName + (this.isHost ? ' (You, Host)' : ' (You)'), isSelf: true }];
    this.peers.forEach((data, peerId) => {
      list.push({ peerId, name: data.name, isSelf: false });
    });
    return list;
  }

  /**
   * Get remote streams map
   */
  getRemoteStreams() {
    return this.remoteStreams;
  }

  /**
   * Stop video streaming (cleanup tracks)
   */
  stopVideo() {
    // Close all media calls
    this.mediaCalls.forEach((call) => {
      try { call.close(); } catch {}
    });
    this.mediaCalls.clear();
    this.remoteStreams.clear();

    // Stop local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
  }

  // --- Event system ---
  on(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event].push(callback);
    }
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter((cb) => cb !== callback);
    }
  }

  _emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach((cb) => cb(data));
    }
  }

  /**
   * Full cleanup — destroy all connections, streams, and peer instance.
   * Ensures zero data remains in memory.
   */
  destroy() {
    this.stopVideo();
    this.connections.forEach((conn) => { try { conn.close(); } catch {} });
    this.connections.clear();
    this.peers.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    // Clear all listener references
    Object.keys(this._listeners).forEach((key) => {
      this._listeners[key] = [];
    });
    this.status = 'disconnected';
  }
}

export default PeerRoom;
