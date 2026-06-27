import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';

const API = 'http://localhost:5000';

function LineChart({ data, color, label }) {
  if (!data || data.length < 2) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
      Complete more sessions to see trends
    </div>
  );
  const W = 400, H = 120, PAD = 20;
  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (v / 100) * (H - PAD * 2);
    return [x, y];
  });
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length-1][0]} ${H} L ${pts[0][0]} ${H} Z`;
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>{label}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {[25, 50, 75].map(v => {
          const y = H - PAD - (v / 100) * (H - PAD * 2);
          return <line key={v} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />;
        })}
        <path d={areaD} fill={`${color}18`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="var(--bg-secondary)" strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {data.map((_, i) => <span key={i} style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>S{i + 1}</span>)}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: color || 'var(--accent)', fontFamily: 'var(--font-display)' }}>{value}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('wpod_userId');
    if (!userId) { setLoading(false); return; }
    fetch(`${API}/api/session/history/${userId}`)
      .then(r => r.json())
      .then(data => { setSessions(data.sessions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...sessions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const overall = sorted.map(s => s.score?.overallScore ?? 0);
  const comm = sorted.map(s => s.score?.communication ?? 0);
  const task = sorted.map(s => s.score?.taskManagement ?? 0);
  const pressure = sorted.map(s => s.score?.pressureHandling ?? 0);

  const avgScore = sessions.length ? Math.round(sessions.reduce((a, s) => a + (s.score?.overallScore ?? 0), 0) / sessions.length) : '--';
  const bestScore = sessions.length ? Math.max(...sessions.map(s => s.score?.overallScore ?? 0)) : '--';
  const rolesPlayed = [...new Set(sessions.map(s => s.role))].length;
  const trend = overall.length >= 2 ? overall[overall.length - 1] - overall[overall.length - 2] : null;

  const ROLE_LABEL = { sde: 'Software Engineer', pm: 'Product Manager', hr: 'HR Manager', ml_intern: 'ML Intern', sde_intern: 'SDE Intern' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar showAuth={false} rightContent={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Home</button>} />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div className="animate-fadeIn" style={{ marginBottom: 40 }}>
          <div className="badge badge-success" style={{ marginBottom: 12 }}>Progress Dashboard</div>
          <h1 className="font-display" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 8 }}>
            Your Growth Over Time
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Track how your skills evolve across every simulation session.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>Loading your sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>📊</div>
            <h3 className="font-display" style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>No sessions yet</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Complete a simulation to start tracking your progress.</p>
            <button className="btn btn-accent" onClick={() => navigate('/select')}>Start a Simulation</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              <StatCard label="Sessions" value={sessions.length} sub="completed" />
              <StatCard label="Avg Score" value={avgScore} sub="across all sessions" color="var(--accent)" />
              <StatCard label="Best Score" value={bestScore} sub="personal best" color="var(--success)" />
              <StatCard label="Roles" value={rolesPlayed} sub="practiced" color="var(--warning)" />
            </div>

            {trend !== null && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 8, marginBottom: 24,
                background: trend >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${trend >= 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                fontSize: '0.85rem', color: trend >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600,
              }}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)} pts vs last session — {trend >= 0 ? 'Keep it up!' : 'Room to grow'}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {[
                { title: 'Overall Score', data: overall, color: 'var(--accent)' },
                { title: 'Communication', data: comm, color: '#60a5fa' },
                { title: 'Task Management', data: task, color: '#a78bfa' },
                { title: 'Pressure Handling', data: pressure, color: '#f472b6' },
              ].map(({ title, data, color }, i) => (
                <div key={title} className="card animate-slideUp" style={{ animationDelay: `${i * 80}ms` }}>
                  <h3 className="font-display" style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>{title}</h3>
                  <LineChart data={data} color={color} label="Score per session" />
                </div>
              ))}
            </div>

            <div className="card animate-slideUp">
              <h3 className="font-display" style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>Session History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...sessions].reverse().map((s, i) => {
                  const score = s.score?.overallScore ?? '--';
                  const color = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 10 }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{ROLE_LABEL[s.role] || s.role}</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginLeft: 12 }}>
                          {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color }}>{score}</div>
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