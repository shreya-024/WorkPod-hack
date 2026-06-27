import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';

const API = 'http://localhost:5000';
const ROLE_LABEL = { sde: 'Software Engineer', pm: 'Product Manager', hr: 'HR Manager', ml_intern: 'ML Intern', sde_intern: 'SDE Intern' };

function RoleCard({ role, sessions }) {
  const scores = sessions.map(s => s.score?.overallScore ?? 0);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const best = Math.max(...scores);
  const color = avg >= 75 ? 'var(--success)' : avg >= 50 ? 'var(--warning)' : 'var(--danger)';
  const skillAvg = (key) => Math.round(sessions.reduce((a, s) => a + (s.score?.[key] ?? 0), 0) / sessions.length);

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
          {role.toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{ROLE_LABEL[role] || role}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.6rem', color, fontFamily: 'var(--font-display)' }}>{avg}</div>
      </div>
      {[
        { label: 'Communication', key: 'communication', color: '#60a5fa' },
        { label: 'Task Management', key: 'taskManagement', color: '#a78bfa' },
        { label: 'Pressure Handling', key: 'pressureHandling', color: '#f472b6' },
      ].map(({ label, key, color: c }) => {
        const val = skillAvg(key);
        return (
          <div key={key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{label}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: c }}>{val}%</span>
            </div>
            <div style={{ height: 5, background: 'var(--bg-tertiary)', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${val}%`, background: c, borderRadius: 99 }} />
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Personal best</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>{best}</span>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const userName = localStorage.getItem('wpod_name') || 'Your';

  useEffect(() => {
    const userId = localStorage.getItem('wpod_userId');
    if (!userId) { setLoading(false); return; }
    fetch(`${API}/api/session/history/${userId}`)
      .then(r => r.json())
      .then(data => { setSessions(data.sessions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const byRole = sessions.reduce((acc, s) => {
    if (!acc[s.role]) acc[s.role] = [];
    acc[s.role].push(s);
    return acc;
  }, {});

  const totalAvg = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + (s.score?.overallScore ?? 0), 0) / sessions.length)
    : 0;

  const sortedSessions = [...sessions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar showAuth={false} rightContent={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Home</button>} />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div className="animate-fadeIn" style={{ marginBottom: 40 }}>
          <div className="badge badge-success" style={{ marginBottom: 12 }}>Portfolio</div>
          <h1 className="font-display" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 8 }}>
            {userName}'s WorkPod Journey
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} · {Object.keys(byRole).length} role{Object.keys(byRole).length !== 1 ? 's' : ''} · Avg score: <strong style={{ color: 'var(--accent)' }}>{totalAvg || '--'}</strong>
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>Loading your portfolio...</div>
        ) : sessions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <h3 className="font-display" style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Your journey starts here</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Complete your first simulation to build your portfolio.</p>
            <button className="btn btn-accent" onClick={() => navigate('/select')}>Start a Simulation</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
              {Object.entries(byRole).map(([role, s]) => <RoleCard key={role} role={role} sessions={s} />)}
            </div>
            <div className="card animate-slideUp">
              <h3 className="font-display" style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 20, color: 'var(--text-primary)' }}>Session Timeline</h3>
              <div style={{ position: 'relative', paddingLeft: 28 }}>
                <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
                {sortedSessions.slice(0, 10).map((s, i) => {
                  const score = s.score?.overallScore ?? 0;
                  const dotColor = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
                  return (
                    <div key={i} style={{ position: 'relative', marginBottom: 16 }}>
                      <div style={{ position: 'absolute', left: -24, top: 6, width: 12, height: 12, borderRadius: '50%', background: dotColor, border: '2px solid var(--bg-primary)', boxShadow: `0 0 6px ${dotColor}` }} />
                      <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{ROLE_LABEL[s.role] || s.role}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginLeft: 10 }}>
                            {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, color: dotColor, fontSize: '0.95rem' }}>{score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}