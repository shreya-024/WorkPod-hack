import { useState } from 'react';
import ThemeToggle from './ThemeToggle.jsx';
import MeetingModal from './MeetingModal.jsx';

const AlertTriangle = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ClockIcon = ({ color }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CameraIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

export default function SimTopBar({
  scenario,
  roomCode,
  roomParticipants = [],
  timerSeconds,
  onEndSession,
  onEmergency,
  showEmergencyBtn,
  role,
}) {
  const [isMeetOpen, setIsMeetOpen] = useState(false);

  const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const secs = String(timerSeconds % 60).padStart(2, '0');
  const timerCritical = timerSeconds < 300;   // < 5 min
  const timerWarn = timerSeconds < 900;   // < 15 min

  const timerColor = timerCritical
    ? 'var(--danger)'
    : timerWarn
      ? 'var(--warning)'
      : 'var(--text-secondary)';

  const othersCount = roomParticipants.length > 1 ? roomParticipants.length - 1 : 0;

  return (
    <>
      <header className="sim-topbar">
        {/* Left — logo + scenario */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '0.95rem',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>
            Work<span style={{ color: '#0a66c2' }}>Pod</span>
          </span>
          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {scenario?.teamName}
            {scenario?.label && (
              <span style={{ color: 'var(--text-primary)', marginLeft: 5 }}>
                — {scenario.label}
              </span>
            )}
          </span>
          {othersCount > 0 && (
            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
              +{othersCount} in room
            </span>
          )}
          {roomCode && (
            <span style={{
              fontSize: '0.65rem', color: 'var(--text-tertiary)',
              fontFamily: 'monospace',
            }}>
              #{roomCode.split('-').slice(-1)[0]}
            </span>
          )}
        </div>

        {/* Center — "Simulation Active" as plain text + dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--success)',
            display: 'inline-block',
            animation: 'pulse 2s infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>
            Simulation Active
          </span>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {showEmergencyBtn && (
            <button
              id="emergency-trigger-btn"
              className="btn btn-danger btn-sm"
              onClick={onEmergency}
              style={{ display: 'flex', alignItems: 'center', gap: 5, animation: 'pulse-ring 2s infinite' }}
            >
              <AlertTriangle />
              Emergency
            </button>
          )}

          {/* Meet button */}
          <button
            id="meet-btn"
            className="btn btn-ghost btn-sm"
            onClick={() => setIsMeetOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}
            title="Start a video call"
          >
            <CameraIcon />
            Meet
          </button>

          {/* Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <ClockIcon color={timerColor} />
            <span style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: timerColor,
              letterSpacing: '0.04em',
            }}>
              {mins}:{secs}
            </span>
          </div>

          {/* End Session */}
          <button
            id="end-session-btn"
            className="btn btn-ghost btn-sm"
            onClick={onEndSession}
            style={{ fontSize: '0.78rem' }}
          >
            End Session
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Meeting Modal */}
      {isMeetOpen && (
        <MeetingModal
          scenarioName={scenario?.teamName || 'WorkPod'}
          roomId={roomCode}
          role={role}
          onClose={() => setIsMeetOpen(false)}
        />
      )}
    </>
  );
}
