import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../store/useSimStore.js';
import { ROLES, getScenario } from '../scenarios/index.js';
import api from '../lib/api.js';
import Navbar from '../components/Navbar.jsx';
import TeamSelectionModal from '../components/TeamSelectionModal.jsx';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const ROLE_META = {
  sde: {
    accent: 'var(--accent)',
    difficulty: 'Intermediate',
    tasks: [
      'Review critical pull requests',
      'Fix failing CI/CD pipeline',
      'Debug production auth issue',
      'Write unit tests (80% coverage)',
    ],
  },
  hr: {
    accent: '#2ecc8a',
    difficulty: 'Beginner',
    tasks: [
      'Complete new hire onboarding',
      'Conduct performance review',
      'Handle employee complaint',
      'Allocate L&D budget',
    ],
  },
  pm: {
    accent: '#f0a500',
    difficulty: 'Intermediate',
    tasks: [
      'Write product spec for new feature',
      'Align cross-functional stakeholders',
      'Analyze beta metrics dashboard',
      'Draft launch announcement',
    ],
  },
  ml_intern: {
    accent: '#8b5cf6',
    difficulty: 'Beginner',
    tasks: [
      'Read ML team onboarding docs',
      'Explore & describe Titanic dataset',
      'Build preprocessing + training pipeline',
      'Submit model summary or predictions',
    ],
  },
  sde_intern: {
    accent: '#3b82f6',
    difficulty: 'Beginner',
    tasks: [
      'Read the onboarding wiki',
      'Fix a bug from a GitHub issue',
      'Write a unit test for the fix',
      'Submit a PR description',
    ],
  },
};

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const LiveDot = () => (
  <span style={{
    width: 7, height: 7, borderRadius: '50%',
    background: 'var(--success)',
    display: 'inline-block',
    boxShadow: '0 0 5px var(--success)',
    animation: 'pulse 2s infinite',
  }} />
);

const UsersIconSm = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export default function RoleSelectPage() {
  const navigate = useNavigate();
  const { setRole, setTeamComposition, user, guestId, resetSim } = useSimStore();
  const [counts, setCounts] = useState({ sde: 0, hr: 0, pm: 0, ml_intern: 0, sde_intern: 0 });
  const [selecting, setSelecting] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedRoleForTeam, setSelectedRoleForTeam] = useState(null);
  const [availableHumans, setAvailableHumans] = useState([]);
  const [loadingHumans, setLoadingHumans] = useState(false);
  const probeSocketRef = useRef(null);

  useEffect(() => { resetSim(); }, []);

  // Cleanup probe socket on unmount
  useEffect(() => {
    return () => {
      if (probeSocketRef.current) {
        probeSocketRef.current.disconnect();
        probeSocketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const results = await Promise.all(
          ROLES.map(r => api.get(`/api/room/count/${r.id}`))
        );
        const next = {};
        results.forEach(({ data }) => { next[data.role] = data.count; });
        setCounts(next);
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = (roleId) => {
    setSelecting(roleId);
    setSelectedRoleForTeam(roleId);
    setAvailableHumans([]);
    setLoadingHumans(true);
    setShowTeamModal(true);

    // Disconnect any previous probe socket
    if (probeSocketRef.current) {
      probeSocketRef.current.disconnect();
    }

    // Create a temporary socket just to query available humans
    const probeSocket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    probeSocketRef.current = probeSocket;

    probeSocket.on('connect', () => {
      probeSocket.emit('get-available-humans', { role: roleId });
    });

    probeSocket.on('available-humans', ({ rooms }) => {
      setAvailableHumans(rooms || []);
      setLoadingHumans(false);
      // Disconnect after receiving the data
      probeSocket.disconnect();
      probeSocketRef.current = null;
    });

    probeSocket.on('connect_error', () => {
      setLoadingHumans(false);
    });

    // Fallback timeout in case server doesn't respond
    setTimeout(() => {
      setLoadingHumans(false);
    }, 5000);
  };

  const handleTeamSelection = (teamType) => {
    setTeamComposition(teamType);
    const scenario = getScenario(selectedRoleForTeam);
    setRole(selectedRoleForTeam, scenario);
    setShowTeamModal(false);
    navigate('/sim');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', position: 'relative' }}>
      <div className="bg-grid-pattern" />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Navbar showAuth={true} />

      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '64px 48px',
        maxWidth: 1100, margin: '0 auto', width: '100%',
      }}>
        {/* Header */}
        <div className="animate-fadeIn" style={{ textAlign: 'center', marginBottom: 56 }}>
          <h1 className="font-display" style={{
            fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
            fontWeight: 800, letterSpacing: '-0.03em',
            color: 'var(--text-primary)', marginBottom: 12,
          }}>
            What role do you want to simulate today?
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            You'll be placed in a realistic workplace with AI teammates for 45 minutes
          </p>
        </div>

        {/* Role Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24, width: '100%',
        }}>
          {ROLES.map((role, i) => {
            const scenario = getScenario(role.id);
            const meta = ROLE_META[role.id] || {};
            const isLoading = selecting === role.id;
            const liveCount = counts[role.id] || 0;

            return (
              <RoleCard
                key={role.id}
                role={role}
                scenario={scenario}
                meta={meta}
                liveCount={liveCount}
                isLoading={isLoading}
                disabled={!!selecting}
                delay={i * 80}
                onSelect={() => handleSelect(role.id)}
              />
            );
          })}
        </div>

        {/* Guest notice */}
        {!user && (
          <div style={{
            marginTop: 48, padding: '14px 24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: '0.85rem', color: 'var(--text-secondary)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Playing as guest — sign in to save your report
          </div>
        )}
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '24px',
        color: 'var(--text-tertiary)',
        fontSize: '0.8rem',
        marginTop: 'auto'
      }}>
        Powered by <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Jalebi.</span>
      </footer>

      {/* Team Selection Modal */}
      {showTeamModal && (
        <TeamSelectionModal
          onSelect={handleTeamSelection}
          onCancel={() => {
            setShowTeamModal(false);
            setSelecting(null);
          }}
          role={selectedRoleForTeam}
          availableHumans={availableHumans}
          loadingHumans={loadingHumans}
        />
      )}
    </div>
    </div>
  );
}

function RoleCard({ role, scenario, meta, liveCount, isLoading, disabled, delay, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const accent = meta.accent || 'var(--accent)';
  const isIntern = role.id.includes('intern');
  const borderGradient = isIntern 
    ? 'linear-gradient(135deg, #f59e0b, #f97316)' 
    : 'linear-gradient(135deg, #3b82f6, #8b5cf6)';

  return (
    <button
      id={`role-card-${role.id}`}
      onClick={onSelect}
      disabled={disabled}
      className="card-hover-lift"
      style={{
        background: 'var(--bg-card)',
        border: 'none',
        borderRadius: 16,
        padding: '28px 24px',
        cursor: disabled ? 'wait' : 'pointer',
        textAlign: 'left',
        position: 'relative',
        zIndex: 1,
        animation: `slideUp 0.5s ${delay}ms both`,
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Gradient Border via mask compositing */}
      <div style={{
        position: 'absolute',
        inset: 0,
        padding: 2,
        borderRadius: 16,
        background: borderGradient,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        zIndex: -1,
        opacity: hovered || isLoading ? 1 : 0.4,
        transition: 'opacity 0.3s',
        boxShadow: hovered ? `0 0 20px ${isIntern ? 'rgba(249,115,22,0.2)' : 'rgba(139,92,246,0.2)'}` : 'none'
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{role.icon}</span> {role.label}
          </h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            {scenario?.teamName || role.description?.split('.')[0]}
          </div>
        </div>
        {liveCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.72rem', color: 'var(--success)',
            background: 'rgba(46,204,138,0.1)',
            padding: '3px 10px', borderRadius: 20, flexShrink: 0,
          }}>
            <LiveDot />
            {liveCount} live
          </div>
        )}
      </div>

      {/* Task bullets */}
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {(meta.tasks || []).map(t => (
          <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: accent, marginTop: 1, flexShrink: 0 }}><CheckIcon /></span>
            {t}
          </li>
        ))}
      </ul>

      {/* Team avatars */}
      {scenario?.members && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: -4 }}>
            {scenario.members.slice(0, 4).map(m => (
              <div key={m.id} title={`${m.name} — ${m.role}`} style={{
                width: 28, height: 28, borderRadius: '50%',
                background: m.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 700,
                border: '2px solid var(--bg-card)',
                marginLeft: -6,
              }}>
                {m.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
            ))}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <UsersIconSm /> {scenario.members.length} AI teammates
          </span>
        </div>
      )}

      {/* Difficulty & Badge */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          fontSize: '0.72rem', fontWeight: 600,
          color: accent, background: `${accent}12`,
          padding: '3px 10px', borderRadius: 20,
        }}>
          {meta.difficulty || 'Intermediate'}
        </span>
        {role.id.includes('intern') && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: '0.72rem', fontWeight: 600,
            color: '#fff',
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            padding: '3px 10px', borderRadius: 20,
            boxShadow: '0 2px 10px rgba(99, 102, 241, 0.2)'
          }}>
            Intern Track
          </span>
        )}
      </div>

      {/* CTA */}
      <div style={{
        marginTop: 'auto',
        background: accent,
        color: '#fff',
        borderRadius: 8,
        padding: '11px 16px',
        fontSize: '0.88rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}>
        {isLoading
          ? <span className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} />
          : <>Start this role <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg></>
        }
      </div>
    </button>
  );
}
