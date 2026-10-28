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
  | { type: 'LIVE_UPDATE'; document: Document };

interface UseP2PSyncOptions {
  documents: Document[];
  onDocumentsMerged: (merged: Document[]) => void;
  onLiveUpdate: (doc: Document) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

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

  // Send message to all connected peers
  const broadcast = useCallback((msg: SyncMessage) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(msg);
      }
    });
  }, []);

  // Handle incoming message from any connection
  const handleData = useCallback(
    (data: unknown, conn: DataConnection) => {
      const msg = data as SyncMessage;
      if (!msg || !msg.type) return;

      if (msg.type === 'HELLO') {
        // Automatically respond with our current document library
        conn.send({
          type: 'SYNC_OFFER',
          documents: docsRef.current,
        });
        return;
      }

      if (msg.type === 'SYNC_OFFER') {
        // Two-way merge
        const result = mergeDocumentLibraries(docsRef.current, msg.documents);
        setLastSyncStats(result.stats);

        if (result.hasChanges) {
          onDocumentsMerged(result.merged);
        }

        // Send back the merged library so both sides are 100% in sync
        conn.send({
          type: 'SYNC_REPLY',
          documents: result.merged,
          stats: result.stats,
        });

        const totalChanges = result.stats.addedFromRemote + result.stats.updatedFromRemote;
        if (totalChanges > 0) {
          onToast(`Merged ${totalChanges} notes from peer!`, 'success');
        } else {
          onToast('Libraries are already synchronized!', 'info');
        }
        return;
      }

      if (msg.type === 'SYNC_REPLY') {
        onDocumentsMerged(msg.documents);
        setLastSyncStats(msg.stats);
        const total = msg.stats.addedFromRemote + msg.stats.updatedFromRemote;
        if (total > 0) {
          onToast(`Synchronized! ${total} notes updated.`, 'success');
        } else {
          onToast('Two-way sync complete! Devices are identical.', 'success');
        }
        return;
      }

      if (msg.type === 'LIVE_UPDATE') {
        onLiveUpdate(msg.document);
      }
    },
    [onDocumentsMerged, onLiveUpdate, onToast]
  );

  // Setup connection event listeners
  const setupConnection = useCallback(
    (conn: DataConnection) => {
      conn.on('open', () => {
        connectionsRef.current.set(conn.peer, conn);
        setConnectedPeers(connectionsRef.current.size);
        setStatus('connected');
        setErrorMessage(null);
        onToast('Device connected! Syncing notes...', 'success');

        // Greet and initiate sync
        conn.send({
          type: 'HELLO',
          peerId: peerRef.current?.id ?? '',
        });
      });

      conn.on('data', (data) => {
        handleData(data, conn);
      });

      conn.on('close', () => {
        connectionsRef.current.delete(conn.peer);
        setConnectedPeers(connectionsRef.current.size);
        if (connectionsRef.current.size === 0) {
          setStatus('waiting');
          onToast('Peer disconnected', 'info');
        }
      });

      conn.on('error', (err) => {
        console.error('Peer connection error:', err);
      });
    },
    [handleData, onToast]
  );

  // Start hosting (creates a new Peer with a clean ID and awaits incoming connections)
  const startHosting = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    connectionsRef.current.clear();
    setConnectedPeers(0);
    setStatus('initializing');
    setErrorMessage(null);

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const newId = `rexmd-${randomSuffix}`;

    const peer = new Peer(newId, {
      debug: 1,
    });
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      setStatus('waiting');
    });

    peer.on('connection', (conn) => {
      setupConnection(conn);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Connection error occurred');
    });
  }, [setupConnection]);

  // Connect to an existing host peer (e.g. mobile scanning PC QR code)
  const connectToHost = useCallback(
    (hostId: string) => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      connectionsRef.current.clear();
      setConnectedPeers(0);
      setStatus('connecting');
      setErrorMessage(null);

      const clientRandom = Math.random().toString(36).substring(2, 8);
      const peer = new Peer(`rexmd-client-${clientRandom}`, {
        debug: 1,
      });
      peerRef.current = peer;

      peer.on('open', (myId) => {
        setPeerId(myId);
        const conn = peer.connect(hostId, { reliable: true });
        setupConnection(conn);
      });

      peer.on('error', (err) => {
        console.error('Peer client error:', err);
        setStatus('error');
        setErrorMessage(`Failed to connect to ${hostId}. Please check the code and ensure both devices have internet.`);
      });
    },
    [setupConnection]
  );

  // Manual Trigger: Trigger two-way sync offer now
  const syncNow = useCallback(() => {
    if (connectionsRef.current.size === 0) {
      onToast('No peer connected to sync with', 'error');
      return;
    }
    broadcast({
      type: 'SYNC_OFFER',
      documents: docsRef.current,
    });
    onToast('Sync offer sent to peer...', 'info');
  }, [broadcast, onToast]);

  // Disconnect & destroy
  const disconnect = useCallback(() => {
    connectionsRef.current.forEach((conn) => conn.close());
    connectionsRef.current.clear();
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setPeerId(null);
    setConnectedPeers(0);
    setStatus('disconnected');
  }, []);

  // Broadcast live document updates while connected
  const broadcastLiveUpdate = useCallback(
    (doc: Document) => {
      if (connectionsRef.current.size > 0) {
        broadcast({
          type: 'LIVE_UPDATE',
          document: doc,
        });
      }
    },
    [broadcast]
  );

  // Cleanup on unmount
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
