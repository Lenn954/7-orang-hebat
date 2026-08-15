/**
 * peerService.js
 * WebRTC peer-to-peer room system using PeerJS.
 * Allows multiple users to connect via a shared Room ID and exchange photos in real-time.
 */

import Peer from 'peerjs';

const ROOM_PREFIX = 'scrapbook-puzzle-';

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
 * PeerRoom — manages a WebRTC room session
 */
export class PeerRoom {
  constructor() {
    this.peer = null;
    this.connections = new Map(); // peerId -> DataConnection
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
      allPhotos: [],
    };
    this._status = 'disconnected'; // disconnected | connecting | connected | error
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
        // Listen for incoming connections
        this.peer.on('connection', (conn) => this._handleIncomingConnection(conn));
        resolve(this.roomId);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        if (err.type === 'unavailable-id') {
          // Room ID already taken, generate new one
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
          // Send our name
          conn.send({ type: 'introduce', name: this.myName });
          resolve();
        });

        conn.on('error', (err) => {
          this.status = 'error';
          this._emit('error', 'Failed to connect to room');
          reject(err);
        });

        // Listen for incoming connections (for peer-to-peer mesh)
        this.peer.on('connection', (inConn) => this._handleIncomingConnection(inConn));

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
   * Handle an incoming peer connection
   */
  _handleIncomingConnection(conn) {
    const peerName = conn.metadata?.name || 'Unknown';
    conn.on('open', () => {
      this._setupConnection(conn, peerName);
      // If host, broadcast updated peer list
      if (this.isHost) {
        this._broadcastPeerList();
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
      this._emit('peerLeft', { peerId, name });
      if (this.isHost) {
        this._broadcastPeerList();
      }
    });

    conn.on('error', (err) => {
      console.error(`Connection error with ${name}:`, err);
    });
  }

  /**
   * Handle incoming messages
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
        // If host, relay to other peers
        if (this.isHost) {
          this.connections.forEach((conn, connPeerId) => {
            if (connPeerId !== fromPeerId) {
              conn.send(data);
            }
          });
        }
        break;
      }
      case 'peerList': {
        // Update peer list from host
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
   * Broadcast photo to all connected peers
   * @param {string} imageData - Base64 image data URL
   * @param {number} photoIndex - Index of the photo (0-3)
   */
  broadcastPhoto(imageData, photoIndex = 0) {
    const message = {
      type: 'photo',
      imageData,
      photoIndex,
      senderName: this.myName,
    };
    this.connections.forEach((conn) => {
      try {
        conn.send(message);
      } catch (err) {
        console.error('Failed to send photo:', err);
      }
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
    // Include self
    peerList.push({ peerId: this.peer?.id, name: this.myName + ' (Host)' });

    const message = { type: 'peerList', peers: peerList };
    this.connections.forEach((conn) => {
      try {
        conn.send(message);
      } catch (err) {
        console.error('Failed to send peer list:', err);
      }
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
   * Get photos from a specific peer
   */
  getPeerPhotos(peerId) {
    const peer = this.peers.get(peerId);
    return peer ? peer.photos : [];
  }

  /**
   * Event listener registration
   */
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
   * Cleanup and destroy all connections
   */
  destroy() {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.peers.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.status = 'disconnected';
  }
}

export default PeerRoom;
