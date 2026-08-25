import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const ROLE_LABEL = { sde: 'Software Engineer', pm: 'Product Manager', hr: 'HR Manager', ml_intern: 'ML Intern', sde_intern: 'SDE Intern' };
const MEDAL = ['1st', '2nd', '3rd'];
const ROLES = ['sde', 'pm', 'hr', 'ml_intern', 'sde_intern'];

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const currentUserId = localStorage.getItem('wpod_userId');

  useEffect(() => {
    setLoading(true);
    const url = filter === 'all' ? `${API}/api/leaderboard` : `${API}/api/leaderboard?role=${filter}`;
    fetch(url)
      .then(r => r.json())
      .then(data => { setEntries(data.leaderboard || []); setLoading(false); })
      .catch(() => setLoading(false));

    if (currentUserId) {
      const rankUrl = filter === 'all'
        ? `${API}/api/leaderboard/me/${currentUserId}`
        : `${API}/api/leaderboard/me/${currentUserId}?role=${filter}`;
      fetch(rankUrl).then(r => r.json()).then(setMyRank).catch(() => {});
    }
  }, [filter]);

  const sorted = [...entries].sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar showAuth={false} rightContent={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Home</button>} />
      <main style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div className="animate-fadeIn" style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="badge badge-success" style={{ marginBottom: 12 }}>Leaderboard</div>
          <h1 className="font-display" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 8 }}>
            Top Performers
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Best average scores across all WorkPod simulations</p>
        </div>

        {myRank?.rank && (
          <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', border: '1px solid var(--accent)', background: 'var(--accent-muted)' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Your Ranking</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Top {myRank.percentile}% · {myRank.sessionCount} sessions</div>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.8rem', color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>#{myRank.rank}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {['all', ...ROLES].map(r => (
            <button key={r} onClick={() => setFilter(r)} style={{
              padding: '6px 16px', borderRadius: 20, border: '1px solid',
              borderColor: filter === r ? 'var(--accent)' : 'var(--border)',
              background: filter === r ? 'var(--accent-muted)' : 'transparent',
              color: filter === r ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {r === 'all' ? 'All Roles' : (ROLE_LABEL[r] || r)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>Loading leaderboard...</div>
        ) : sorted.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <h3 className="font-display" style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>No entries yet</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Be the first on the leaderboard!</p>
            <button className="btn btn-accent" onClick={() => navigate('/select')}>Start a Simulation</button>
          </div>
        ) : (
          <>
            {sorted.length >= 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 12, marginBottom: 24, alignItems: 'end' }}>
                {[1, 0, 2].map(rank => {
                  const e = sorted[rank];
                  if (!e) return <div key={rank} />;
                  const isMe = e.userId?.toString() === currentUserId;
                  return (
                    <div key={rank} className="card" style={{
                      textAlign: 'center',
                      padding: rank === 0 ? '28px 16px' : '20px 16px',
                      border: isMe ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: isMe ? 'var(--accent-muted)' : undefined,
                    }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-display)', marginBottom: 12 }}>
                        {MEDAL[rank]} Place
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                        {e.name}{isMe ? ' (you)' : ''}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                        {e.sessionCount} session{e.sessionCount !== 1 ? 's' : ''}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{e.avgScore}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>avg score</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="card animate-slideUp">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sorted.map((e, i) => {
                  const isMe = e.userId?.toString() === currentUserId;
                  const color = e.avgScore >= 75 ? 'var(--success)' : e.avgScore >= 50 ? 'var(--warning)' : 'var(--danger)';
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderRadius: 10,
                      background: isMe ? 'var(--accent-muted)' : (i % 2 === 0 ? 'var(--bg-tertiary)' : 'transparent'),
                      border: isMe ? '1px solid var(--accent)' : '1px solid transparent',
                    }}>
                      <div style={{ width: 36, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                        {i < 3 ? MEDAL[i] : `#${i + 1}`}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {e.name}{isMe && <span style={{ color: 'var(--accent)', fontSize: '0.72rem', marginLeft: 6, fontWeight: 700 }}>YOU</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                          {e.sessionCount} session{e.sessionCount !== 1 ? 's' : ''} · Best: {e.bestScore}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color, fontFamily: 'var(--font-display)' }}>{e.avgScore}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>avg</div>
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