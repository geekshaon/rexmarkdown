import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X, QrCode, Smartphone, ArrowLeftRight, CheckCircle2,
  Copy, RefreshCw, AlertCircle, Wifi, Laptop, Link2,
} from 'lucide-react';
import type { SyncStatus } from '../hooks/useP2PSync';
import type { MergeResult } from '../utils/syncMerge';

interface SyncModalProps {
  peerId: string | null;
  status: SyncStatus;
  connectedPeers: number;
  lastSyncStats: MergeResult['stats'] | null;
  errorMessage: string | null;
  onStartHost: () => void;
  onConnectToHost: (hostId: string) => void;
  onSyncNow: () => void;
  onClose: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  peerId,
  status,
  connectedPeers,
  lastSyncStats,
  errorMessage,
  onStartHost,
  onConnectToHost,
  onSyncNow,
  onClose,
  onToast,
}) => {
  const [tab, setTab] = useState<'qr' | 'manual'>('qr');
  const [manualCode, setManualCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Automatically start hosting session when modal opens if not already active
  useEffect(() => {
    if (status === 'disconnected') {
      onStartHost();
    }
  }, [status, onStartHost]);

  // Handle ESC key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Pairing link
  const pairingUrl = peerId
    ? `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(peerId)}`
    : '';

  const handleCopyLink = async () => {
    if (!pairingUrl) return;
    try {
      await navigator.clipboard.writeText(pairingUrl);
      setCopied(true);
      onToast('Pairing link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Could not copy link', 'error');
    }
  };

  const handleCopyCode = async () => {
    if (!peerId) return;
    try {
      await navigator.clipboard.writeText(peerId);
      onToast(`Code ${peerId} copied!`, 'success');
    } catch {
      onToast('Could not copy code', 'error');
    }
  };

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    onConnectToHost(clean);
  };

  const isConnected = status === 'connected';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="P2P Two-Way Sync"
    >
      <div className="modal modal--sync" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal__header">
          <div className="modal__title">
            <ArrowLeftRight size={17} className="icon-pulse-accent" />
            <span>Two-Way P2P Sync (PC ↔ Mobile)</span>
          </div>
          <button className="icon-btn icon-btn--xs" onClick={onClose} aria-label="Close sync modal">
            <X size={14} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="sync-tabs">
          <button
            className={`sync-tab ${tab === 'qr' ? 'sync-tab--active' : ''}`}
            onClick={() => setTab('qr')}
          >
            <QrCode size={14} />
            <span>Scan QR Code</span>
          </button>
          <button
            className={`sync-tab ${tab === 'manual' ? 'sync-tab--active' : ''}`}
            onClick={() => setTab('manual')}
          >
            <Laptop size={14} />
            <span>Connect by Code</span>
          </button>
        </div>

        {/* Status banner */}
        <div className={`sync-status-badge sync-status-badge--${status}`}>
          {status === 'initializing' && (
            <>
              <RefreshCw size={13} className="spin-icon" />
              <span>Generating secure P2P session…</span>
            </>
          )}
          {status === 'waiting' && (
            <>
              <span className="pulse-dot pulse-dot--amber" />
              <span>Ready for connection. Scan QR code with phone camera!</span>
            </>
          )}
          {status === 'connecting' && (
            <>
              <RefreshCw size={13} className="spin-icon" />
              <span>Connecting directly to peer over WebRTC…</span>
            </>
          )}
          {status === 'connected' && (
            <>
              <CheckCircle2 size={14} className="text-emerald" />
              <span>
                <strong>Connected ({connectedPeers} peer{connectedPeers > 1 ? 's' : ''})</strong> — Two-way live sync active!
              </span>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle size={14} className="text-rose" />
              <span>{errorMessage || 'Connection error. Click refresh to retry.'}</span>
            </>
          )}
        </div>

        {/* QR Tab */}
        {tab === 'qr' && (
          <div className="sync-qr-section">
            <div className="sync-qr-frame">
              {peerId ? (
                <div className="sync-qr-wrapper">
                  <QRCodeSVG
                    value={pairingUrl}
                    size={210}
                    level="M"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                  />
                </div>
              ) : (
                <div className="sync-qr-placeholder">
                  <RefreshCw size={24} className="spin-icon" />
                  <span>Loading session…</span>
                </div>
              )}
            </div>

            <div className="sync-instructions">
              <ol>
                <li>
                  <Smartphone size={13} />
                  <span>Open the camera on your phone</span>
                </li>
                <li>
                  <QrCode size={13} />
                  <span>Point at the QR code and tap the link</span>
                </li>
                <li>
                  <Wifi size={13} />
                  <span>Both devices pair & sync two-way automatically!</span>
                </li>
              </ol>
            </div>

            {/* Link & Code Box */}
            <div className="sync-meta-box">
              <div className="sync-meta-row">
                <span className="sync-meta-label">Pairing Link:</span>
                <button
                  className="btn btn--secondary btn--xs"
                  onClick={handleCopyLink}
                  title="Copy full pairing link"
                >
                  <Link2 size={12} />
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              {peerId && (
                <div className="sync-meta-row">
                  <span className="sync-meta-label">Session ID:</span>
                  <code className="sync-code-pill" onClick={handleCopyCode} title="Click to copy code">
                    {peerId}
                    <Copy size={10} style={{ marginLeft: 6, opacity: 0.6 }} />
                  </code>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual Code Tab */}
        {tab === 'manual' && (
          <form className="sync-manual-form" onSubmit={handleManualConnect}>
            <p className="sync-manual-desc">
              Have another device hosting a session? Enter its Session ID below to pair directly:
            </p>
            <div className="sync-input-row">
              <input
                className="find-replace__input"
                placeholder="e.g. rexmd-a8f93e"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="btn btn--primary btn--sm"
                disabled={!manualCode.trim() || status === 'connecting'}
              >
                {status === 'connecting' ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </form>
        )}

        {/* Last sync stats */}
        {lastSyncStats && (
          <div className="sync-stats-box">
            <span className="sync-stats-title">Last Sync Summary:</span>
            <div className="sync-stats-chips">
              <span className="sync-chip sync-chip--green">
                +{lastSyncStats.addedFromRemote} new from peer
              </span>
              <span className="sync-chip sync-chip--blue">
                ↻ {lastSyncStats.updatedFromRemote} updated from peer
              </span>
              <span className="sync-chip sync-chip--purple">
                ↗ {lastSyncStats.sentToRemote} sent to peer
              </span>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="modal__footer sync-modal__footer">
          <button
            className="btn btn--secondary btn--sm"
            onClick={onStartHost}
            title="Generate a new session ID"
          >
            <RefreshCw size={13} />
            <span>New Session</span>
          </button>

          {isConnected && (
            <button
              className="btn btn--primary btn--sm"
              onClick={onSyncNow}
              title="Force an immediate two-way merge exchange"
            >
              <ArrowLeftRight size={13} />
              <span>Sync Now</span>
            </button>
          )}

          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
