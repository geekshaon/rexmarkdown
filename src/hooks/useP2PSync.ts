import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { Document } from '../types';
import { mergeDocumentLibraries } from '../utils/syncMerge';
import type { MergeResult } from '../utils/syncMerge';

export type SyncStatus =
  | 'disconnected'
  | 'initializing'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'error';

export type SyncMessage =
  | { type: 'HELLO'; peerId: string }
  | { type: 'SYNC_OFFER'; documents: Document[] }
  | { type: 'SYNC_REPLY'; documents: Document[]; stats: MergeResult['stats'] }
  | { type: 'LIVE_UPDATE'; document: Document }
  | { type: 'PING' }
  | { type: 'PONG' };

interface UseP2PSyncOptions {
  documents: Document[];
  onDocumentsMerged: (merged: Document[]) => void;
  onLiveUpdate: (doc: Document) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/** Strip history snapshots before sending over the wire (saves significant bandwidth) */
function stripSnapshots(docs: Document[]): Document[] {
  return docs.map(({ snapshots: _s, ...rest }) => ({ ...rest, snapshots: [] }));
}

/** Runtime validation — prevents crashes or injection from bad/malicious peers */
function isValidMessage(data: unknown): data is SyncMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as Record<string, unknown>;
  if (typeof msg.type !== 'string') return false;
  if (msg.type === 'SYNC_OFFER' || msg.type === 'SYNC_REPLY') {
    return Array.isArray(msg.documents);
  }
  if (msg.type === 'LIVE_UPDATE') {
    return !!msg.document && typeof msg.document === 'object';
  }
  return ['HELLO', 'PING', 'PONG'].includes(msg.type);
}

const HEARTBEAT_MS       = 8_000;  // Send PING every 8 s
const DEAD_AFTER_MS      = 25_000; // Peer is dead if silent for 25 s
const CONNECT_TIMEOUT_MS = 15_000; // Give up connecting after 15 s

export function useP2PSync({
  documents,
  onDocumentsMerged,
  onLiveUpdate,
  onToast,
}: UseP2PSyncOptions) {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>('disconnected');
  const [connectedPeers, setConnectedPeers] = useState(0);
  const [lastSyncStats, setLastSyncStats] = useState<MergeResult['stats'] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const docsRef = useRef<Document[]>(documents);
  docsRef.current = documents;

  // Stable peer ID — generated once, survives peer reconnects; only regenerated on "New Session"
  const stableIdRef = useRef<string | null>(null);

  // Per-connection heartbeat intervals and last-seen timestamps
  const heartbeatIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const lastSeenRef = useRef<Map<string, number>>(new Map());

  // Debounce timers for live updates (keyed by document ID, 300 ms per doc)
  const liveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Connection attempt timeout handle
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Broadcast a message to all currently open connections
  const broadcast = useCallback((msg: SyncMessage) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) conn.send(msg);
    });
  }, []);

  // Handle an incoming message from any peer connection
  const handleData = useCallback(
    (data: unknown, conn: DataConnection) => {
      // Update last-seen for heartbeat tracking
      lastSeenRef.current.set(conn.peer, Date.now());

      if (!isValidMessage(data)) {
        console.warn('[Sync] Ignored invalid message from', conn.peer, data);
        return;
      }
      const msg = data;

      if (msg.type === 'PING') {
        conn.send({ type: 'PONG' });
        return;
      }

      if (msg.type === 'PONG') {
        // lastSeen already updated above — no further action needed
        return;
      }

      if (msg.type === 'HELLO') {
        // Peer introduced itself — reply with our full document library
        conn.send({
          type: 'SYNC_OFFER',
          documents: stripSnapshots(docsRef.current),
        });
        return;
      }

      if (msg.type === 'SYNC_OFFER') {
        const result = mergeDocumentLibraries(docsRef.current, msg.documents);
        setLastSyncStats(result.stats);
        if (result.hasChanges) onDocumentsMerged(result.merged);
        // Reply with the merged result so both sides converge
        conn.send({
          type: 'SYNC_REPLY',
          documents: stripSnapshots(result.merged),
          stats: result.stats,
        });
        const changes = result.stats.addedFromRemote + result.stats.updatedFromRemote;
        if (changes > 0) {
          onToast(`Merged ${changes} note${changes !== 1 ? 's' : ''} from peer`, 'success');
        } else {
          onToast('Already in sync — no changes needed', 'info');
        }
        return;
      }

      if (msg.type === 'SYNC_REPLY') {
        // Re-merge against current local state (may have changed during exchange)
        const result = mergeDocumentLibraries(docsRef.current, msg.documents);
        setLastSyncStats(result.stats);
        if (result.hasChanges) onDocumentsMerged(result.merged);
        const changes = result.stats.addedFromRemote + result.stats.updatedFromRemote;
        if (changes > 0) {
          onToast(`Sync complete — ${changes} note${changes !== 1 ? 's' : ''} updated`, 'success');
        } else {
          onToast('Both devices are identical ✓', 'success');
        }
        return;
      }

      if (msg.type === 'LIVE_UPDATE') {
        const incoming = msg.document;
        const localDoc = docsRef.current.find((d) => d.id === incoming.id);
        // Guard: only apply if incoming is newer or brand-new — prevents overwriting local edits
        if (!localDoc || incoming.updatedAt >= localDoc.updatedAt) {
          onLiveUpdate(incoming);
        }
        return;
      }
    },
    [onDocumentsMerged, onLiveUpdate, onToast]
  );

  // Start a heartbeat ping loop for a newly opened connection
  const startHeartbeat = useCallback((conn: DataConnection) => {
    lastSeenRef.current.set(conn.peer, Date.now());
    const interval = setInterval(() => {
      if (!conn.open) {
        clearInterval(interval);
        heartbeatIntervalsRef.current.delete(conn.peer);
        return;
      }
      const lastSeen = lastSeenRef.current.get(conn.peer) ?? 0;
      if (Date.now() - lastSeen > DEAD_AFTER_MS) {
        console.warn('[Sync] Peer silent too long — closing:', conn.peer);
        conn.close();
        return;
      }
      conn.send({ type: 'PING' });
    }, HEARTBEAT_MS);
    heartbeatIntervalsRef.current.set(conn.peer, interval);
  }, []);

  // Stop heartbeat when a connection closes
  const stopHeartbeat = useCallback((connPeerId: string) => {
    const interval = heartbeatIntervalsRef.current.get(connPeerId);
    if (interval) {
      clearInterval(interval);
      heartbeatIntervalsRef.current.delete(connPeerId);
    }
    lastSeenRef.current.delete(connPeerId);
  }, []);

  // Wire up all event listeners on a DataConnection
  const setupConnection = useCallback(
    (conn: DataConnection) => {
      conn.on('open', () => {
        // Clear the pending connection timeout (if any)
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        connectionsRef.current.set(conn.peer, conn);
        setConnectedPeers(connectionsRef.current.size);
        setStatus('connected');
        setErrorMessage(null);
        onToast('Device connected! Syncing notes…', 'success');
        startHeartbeat(conn);
        // Kick off the sync handshake
        conn.send({ type: 'HELLO', peerId: peerRef.current?.id ?? '' });
      });

      conn.on('data', (data) => handleData(data, conn));

      conn.on('close', () => {
        stopHeartbeat(conn.peer);
        connectionsRef.current.delete(conn.peer);
        setConnectedPeers(connectionsRef.current.size);
        if (connectionsRef.current.size === 0) {
          // Go back to "waiting" — session ID is still valid, peer can reconnect
          setStatus('waiting');
          onToast('Peer disconnected', 'info');
        }
      });

      conn.on('error', (err) => {
        console.error('[Sync] Connection error:', err);
        stopHeartbeat(conn.peer);
      });
    },
    [handleData, onToast, startHeartbeat, stopHeartbeat]
  );

  /**
   * Start a host session.
   * - Idempotent: if a peer is already running, this is a no-op (unless forceNew=true).
   * - forceNew=true: generate a brand-new session ID and restart completely.
   */
  const startHosting = useCallback(
    (forceNew = false) => {
      // Already running and healthy — do nothing
      if (!forceNew && peerRef.current && !peerRef.current.destroyed) {
        return;
      }

      if (peerRef.current) peerRef.current.destroy();
      connectionsRef.current.clear();
      setConnectedPeers(0);
      setStatus('initializing');
      setErrorMessage(null);

      // Reuse stable ID unless a new session is explicitly requested
      if (!stableIdRef.current || forceNew) {
        const suffix = Math.random().toString(36).substring(2, 8);
        stableIdRef.current = `rexmd-${suffix}`;
      }

      const peer = new Peer(stableIdRef.current, { debug: 1 });
      peerRef.current = peer;

      peer.on('open', (id) => {
        setPeerId(id);
        setStatus('waiting');
      });

      peer.on('connection', (conn) => setupConnection(conn));

      peer.on('error', (err) => {
        console.error('[Sync] Peer error:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Failed to start session. Check your internet connection.');
      });
    },
    [setupConnection]
  );

  /**
   * Connect to an existing host session (e.g. mobile scanning the PC's QR code).
   */
  const connectToHost = useCallback(
    (hostId: string) => {
      if (peerRef.current) peerRef.current.destroy();
      connectionsRef.current.clear();
      setConnectedPeers(0);
      setStatus('connecting');
      setErrorMessage(null);

      // Timeout: if we haven't connected within 15s, show an error
      connectTimeoutRef.current = setTimeout(() => {
        if (!connectionsRef.current.size) {
          setStatus('error');
          setErrorMessage(
            `Could not reach "${hostId}". Make sure the other device is open and online.`
          );
        }
      }, CONNECT_TIMEOUT_MS);

      const clientSuffix = Math.random().toString(36).substring(2, 8);
      const peer = new Peer(`rexmd-client-${clientSuffix}`, { debug: 1 });
      peerRef.current = peer;

      peer.on('open', (myId) => {
        setPeerId(myId);
        const conn = peer.connect(hostId, { reliable: true });
        setupConnection(conn);
      });

      peer.on('error', (err) => {
        console.error('[Sync] Client peer error:', err);
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setStatus('error');
        setErrorMessage(
          `Could not connect to "${hostId}". Double-check the code and try again.`
        );
      });
    },
    [setupConnection]
  );

  /** Manually trigger a full two-way sync with all connected peers */
  const syncNow = useCallback(() => {
    if (connectionsRef.current.size === 0) {
      onToast('No peer connected to sync with', 'error');
      return;
    }
    broadcast({
      type: 'SYNC_OFFER',
      documents: stripSnapshots(docsRef.current),
    });
    onToast('Syncing…', 'info');
  }, [broadcast, onToast]);

  /** Disconnect all peers and fully reset state */
  const disconnect = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    heartbeatIntervalsRef.current.forEach((interval) => clearInterval(interval));
    heartbeatIntervalsRef.current.clear();
    lastSeenRef.current.clear();
    liveTimersRef.current.forEach((t) => clearTimeout(t));
    liveTimersRef.current.clear();
    connectionsRef.current.forEach((conn) => conn.close());
    connectionsRef.current.clear();
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setPeerId(null);
    setConnectedPeers(0);
    setStatus('disconnected');
    setLastSyncStats(null);
  }, []);

  /**
   * Broadcast a live document update to all peers.
   * Debounced per document ID (300 ms) to avoid flooding the channel on every keystroke.
   */
  const broadcastLiveUpdate = useCallback(
    (doc: Document) => {
      if (connectionsRef.current.size === 0) return;
      const existing = liveTimersRef.current.get(doc.id);
      if (existing) clearTimeout(existing);
      liveTimersRef.current.set(
        doc.id,
        setTimeout(() => {
          liveTimersRef.current.delete(doc.id);
          if (connectionsRef.current.size > 0) {
            broadcast({
              type: 'LIVE_UPDATE',
              document: stripSnapshots([doc])[0],
            });
          }
        }, 300)
      );
    },
    [broadcast]
  );

  // Cleanup all timers and connections on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    peerId,
    status,
    connectedPeers,
    lastSyncStats,
    errorMessage,
    startHosting,
    connectToHost,
    syncNow,
    disconnect,
    broadcastLiveUpdate,
  };
}
