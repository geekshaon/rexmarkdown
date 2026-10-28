import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X, ArrowLeftRight, CheckCircle2, Copy, RefreshCw,
  AlertCircle, Wifi, Smartphone, Link2, Link2Off,
  Upload, Download,
} from 'lucide-react';
import type { SyncStatus } from '../hooks/useP2PSync';
import type { MergeResult } from '../utils/syncMerge';

interface SyncModalProps {
  peerId: string | null;
  status: SyncStatus;
  isHost?: boolean;
  connectedPeers: number;
  lastSyncStats: MergeResult['stats'] | null;
  errorMessage: string | null;
  /** Start (or idempotently resume) a host session — safe to call even when already running */
  onStartHost: (forceNew?: boolean) => void;
  onConnectToHost: (hostId: string) => void;
  onSyncNow: () => void;
  onPushToRemote: () => void;
  onPullFromRemote: () => void;
  onDisconnect?: () => void;
  onClose: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  peerId,
  status,
  isHost: isHostProp,
  connectedPeers,
  lastSyncStats,
  errorMessage,
  onStartHost,
  onConnectToHost,
  onSyncNow,
  onPushToRemote,
  onPullFromRemote,
  onDisconnect,
  onClose,
  onToast,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Start hosting on mount — idempotent: no-op if a peer session is already running
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onStartHost(); }, []);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Only host peers can share a QR — client peers (who joined) don't expose their ID
  const isHost = isHostProp ?? (peerId ? !peerId.startsWith('rexmd-client-') : false);
  const pairingUrl =
    peerId && isHost
      ? `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(peerId)}`
      : '';

  const handleCopyCode = async () => {
    if (!peerId) return;
    try {
      await navigator.clipboard.writeText(peerId);
      setCopiedCode(true);
      onToast('Session code copied!', 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      onToast('Could not copy', 'error');
    }
  };

  const handleCopyLink = async () => {
    if (!pairingUrl) return;
    try {
      await navigator.clipboard.writeText(pairingUrl);
      setCopiedLink(true);
      onToast('Pairing link copied!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      onToast('Could not copy', 'error');
    }
  };

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    onConnectToHost(clean);
  };

  const isConnected  = status === 'connected';
  const isConnecting = status === 'connecting';
  const isError      = status === 'error';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Connect Devices"
    >
      <div className="modal modal--sync" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="modal__header">
          <div className="modal__title">
            <ArrowLeftRight size={17} className="icon-pulse-accent" />
            <span>Connect Devices</span>
          </div>
          <button className="icon-btn icon-btn--xs" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {/* ── Status banner ── */}
        <div className={`sync-status-badge sync-status-badge--${status}`}>
          {status === 'initializing' && (
            <><RefreshCw size={13} className="spin-icon" /><span>Starting session…</span></>
          )}
          {status === 'waiting' && (
            <><span className="pulse-dot pulse-dot--amber" /><span>Ready — scan QR or share your session code</span></>
          )}
          {isConnecting && (
            <><RefreshCw size={13} className="spin-icon" /><span>Connecting to peer…</span></>
          )}
          {isConnected && (
            <>
              <CheckCircle2 size={14} className="text-emerald" />
              <span>
                <strong>Live sync active</strong> — {connectedPeers} device{connectedPeers !== 1 ? 's' : ''} connected
              </span>
            </>
          )}
          {isError && (
            <><AlertCircle size={14} className="text-rose" /><span>{errorMessage || 'Connection failed. Try again.'}</span></>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            CONNECTED VIEW — live status + controls
            ══════════════════════════════════════════════ */}
        {isConnected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Last sync stats */}
            {lastSyncStats && (
              <div className="sync-stats-box">
                <span className="sync-stats-title">Last sync summary</span>
                <div className="sync-stats-chips">
                  <span className="sync-chip sync-chip--green">+{lastSyncStats.addedFromRemote} new from peer</span>
                  <span className="sync-chip sync-chip--blue">↻ {lastSyncStats.updatedFromRemote} updated</span>
                  <span className="sync-chip sync-chip--purple">↗ {lastSyncStats.sentToRemote} sent to peer</span>
                </div>
              </div>
            )}

            {/* Session code — lets additional devices join the same session */}
            {isHost && peerId && (
              <div className="sync-meta-box">
                <p className="sync-manual-desc" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Wifi size={13} />
                  <span>Another device can join this session:</span>
                </p>
                <div className="sync-meta-row">
                  <code
                    className="sync-code-pill"
                    onClick={handleCopyCode}
                    title="Click to copy session code"
                  >
                    {peerId}
                    <Copy size={10} style={{ marginLeft: 6, opacity: 0.6 }} />
                  </code>
                  {copiedCode && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>Copied!</span>
                  )}
                </div>
              </div>
            )}
          </div>

        ) : (
          /* ══════════════════════════════════════════════
              SETUP VIEW — QR + join form
              ══════════════════════════════════════════════ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* QR section — only when this device is the host */}
            {isHost && (
              <div className="sync-qr-section">
                {/* QR code */}
                <div className="sync-qr-frame">
                  {peerId && pairingUrl ? (
                    <div className="sync-qr-wrapper">
                      <QRCodeSVG
                        value={pairingUrl}
                        size={190}
                        level="M"
                        includeMargin={false}
                        bgColor="#ffffff"
                        fgColor="#0f172a"
                      />
                    </div>
                  ) : (
                    <div className="sync-qr-placeholder">
                      <RefreshCw size={22} className="spin-icon" />
                      <span>Generating session…</span>
                    </div>
                  )}
                </div>

                {/* Step instructions */}
                <div className="sync-instructions">
                  <ol>
                    <li>
                      <Smartphone size={13} />
                      <span>Open this app on your other device</span>
                    </li>
                    <li>
                      <span style={{ fontSize: 13, lineHeight: 1 }}>📷</span>
                      <span>Scan the QR code, or copy &amp; share the session code below</span>
                    </li>
                    <li>
                      <Wifi size={13} />
                      <span>Both devices sync instantly — live updates too!</span>
                    </li>
                  </ol>
                </div>

                {/* Session code + copy actions */}
                {peerId && (
                  <div className="sync-meta-box">
                    <div className="sync-meta-row">
                      <code
                        className="sync-code-pill"
                        onClick={handleCopyCode}
                        title="Click to copy session code"
                      >
                        {peerId}
                        <Copy size={10} style={{ marginLeft: 6, opacity: 0.6 }} />
                      </code>
                      {copiedCode
                        ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Copied!</span>
                        : (
                          <button className="btn btn--secondary btn--xs" onClick={handleCopyLink} title="Copy full pairing link">
                            <Link2 size={12} />
                            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                          </button>
                        )
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Divider ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'var(--text-muted)',
              fontSize: 11,
            }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span>or join another device's session</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* ── Manual code entry ── */}
            <form className="sync-manual-form" onSubmit={handleManualConnect} style={{ paddingTop: 0 }}>
              <div className="sync-input-row">
                <input
                  className="find-replace__input"
                  placeholder="Enter session code — e.g. rexmd-a8f93e"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  disabled={isConnecting}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="btn btn--primary btn--sm"
                  disabled={!manualCode.trim() || isConnecting}
                >
                  {isConnecting
                    ? <><RefreshCw size={13} className="spin-icon" /><span>Connecting…</span></>
                    : <span>Connect</span>
                  }
                </button>
              </div>
            </form>

          </div>
        )}

        {/* ── Footer ── */}
        <div className="modal__footer sync-modal__footer">
          {isConnected ? (
            <>
              {/* Send: push my notes to peer */}
              <button
                className="btn btn--primary btn--sm"
                onClick={onPushToRemote}
                title="Send MY notes to the other device"
              >
                <Upload size={13} />
                <span>Send</span>
              </button>

              {/* Receive: pull peer's notes to me */}
              <button
                className="btn btn--primary btn--sm"
                onClick={onPullFromRemote}
                title="Get the other device's notes"
              >
                <Download size={13} />
                <span>Receive</span>
              </button>

              {/* Sync All: full two-way exchange */}
              <button
                className="btn btn--secondary btn--sm"
                onClick={onSyncNow}
                title="Full two-way sync (Send + Receive at once)"
              >
                <ArrowLeftRight size={13} />
                <span>Sync All</span>
              </button>

              {/* Disconnect */}
              {onDisconnect && (
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={onDisconnect}
                  title="Disconnect from peer"
                >
                  <Link2Off size={13} />
                </button>
              )}
            </>
          ) : (
            /* New Session — generates a fresh peer ID */
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => onStartHost(true)}
              title="Generate a brand-new session code"
              disabled={isConnecting}
            >
              <RefreshCw size={13} />
              <span>New Session</span>
            </button>
          )}

          <button
            className="btn btn--ghost btn--sm"
            onClick={onClose}
            style={{ marginLeft: 'auto' }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
