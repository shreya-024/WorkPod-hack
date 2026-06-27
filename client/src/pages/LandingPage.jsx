import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../store/useSimStore.js';
import api from '../lib/api.js';
import Navbar from '../components/Navbar.jsx';

// ── SVG Icons ──────────────────────────────────────────────────────
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const BrainIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.14A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.14A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);
const BuildingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
  </svg>
);
const CodeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// Role card data
const ROLE_CARDS = [
  {
    id: 'sde',
    title: 'Software Engineer',
    subtitle: 'TechCorp Engineering',
    accent: 'var(--accent)',
    difficulty: 'Intermediate',
    tasks: [
      'Review critical pull requests',
      'Fix failing CI/CD pipeline',
      'Debug production auth issue',
      'Write unit tests (80% coverage)',
    ],
  },
  {
    id: 'hr',
    title: 'HR Manager',
    subtitle: 'People & Culture Team',
    accent: '#2ecc8a',
    difficulty: 'Beginner',
    tasks: [
      'Complete new hire onboarding',
      'Conduct performance review',
      'Handle employee complaint',
      'Allocate L&D budget',
    ],
  },
  {
    id: 'pm',
    title: 'Product Manager',
    subtitle: 'Product Strategy Division',
    accent: '#f0a500',
    difficulty: 'Intermediate',
    tasks: [
      'Write product spec for new feature',
      'Align cross-functional stakeholders',
      'Analyze beta metrics dashboard',
      'Draft launch announcement',
    ],
  },
];

const HOW_IT_WORKS = [
  { n: '01', title: 'Pick a role', desc: 'Choose SDE, HR, or PM — each has a unique scenario.' },
  { n: '02', title: 'Work with AI teammates', desc: 'Your AI colleagues brief you, assign tasks, and react to your messages.' },
  { n: '03', title: 'Face unexpected challenges', desc: 'A real emergency scenario triggers mid-simulation. Stay calm.' },
  { n: '04', title: 'Get your performance report', desc: 'AI grades your communication, task handling, and pressure response.' },
];

const TESTIMONIALS = [
  {
    quote: 'Used WorkPod before my SDE internship interview. The emergency scenario prep was invaluable — I handled the on-call incident in my actual interview without breaking a sweat.',
    author: 'Final year CS student, IIT Bombay',
  },
  {
    quote: 'As someone switching from engineering to PM, WorkPod let me experience a real product sprint before my first job. The AI feedback pointed out exactly where my communication broke down.',
    author: 'Career transitioner, ex-Backend Engineer',
  },
  {
    quote: 'My university does not offer business simulation courses. WorkPod gave me 45 minutes of HR experience that felt completely real. I could actually answer behavioral questions confidently.',
    author: 'MBA student, final semester',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { setUser } = useSimStore();
  const [modal, setModal] = useState(null); // 'login' | 'register' | null
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLoggedIn = !!localStorage.getItem('wpod_userId');
  const userName = localStorage.getItem('wpod_name') || 'User';

  const handleGuest = () => navigate('/select');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = modal === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = modal === 'login'
        ? { email: form.email, password: form.password }
        : { email: form.email, name: form.name, password: form.password };
      const { data } = await api.post(endpoint, payload);
      setUser(data.user, data.token);
      setModal(null);
      // Stay on landing page, let them choose what to do!
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar
        onSignIn={() => setModal('login')}
        onGetStarted={() => setModal('register')}
      />

      {/* ── HERO ───────────────────────────────────────────── */}
      <section style={{
        display: 'flex',
        alignItems: 'center',
        maxWidth: 1200,
        margin: '0 auto',
        padding: '80px 48px 100px',
        gap: 64,
        width: '100%',
      }}>
        {/* Left 50% */}
        <div style={{ flex: '0 0 50%' }}>
          {isLoggedIn ? (
            <>
              <div className="animate-fadeIn" style={{
                display: 'inline-block',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--accent)',
                marginBottom: 20,
                padding: '4px 0',
              }}>
                Welcome Back, {userName}!
              </div>

              <h1 className="font-display animate-fadeIn" style={{
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
                marginBottom: 24,
                animationDelay: '60ms',
              }}>
                Ready for your next<br />simulation sprint?<br />
                <span style={{ color: 'var(--accent)' }}>Practice makes perfect.</span>
              </h1>

              <p style={{
                fontSize: '1.1rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.75,
                maxWidth: 520,
                marginBottom: 36,
                animation: 'fadeIn 0.5s 120ms both',
              }}>
                Step back into real workplace scenarios. Continue building your portfolio, track your performance metrics, or challenge yourself with a new role.
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40, animation: 'fadeIn 0.5s 180ms both' }}>
                <button
                  className="btn btn-accent btn-lg"
                  id="landing-start-btn"
                  onClick={() => navigate('/select')}
                  style={{ minWidth: 180 }}
                >
                  Start Simulation
                </button>
                <button
                  className="btn btn-ghost btn-lg"
                  id="landing-profile-btn"
                  onClick={() => navigate('/portfolio')}
                  style={{ minWidth: 180 }}
                >
                  Visit My Profile
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="animate-fadeIn" style={{
                display: 'inline-block',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--accent)',
                marginBottom: 20,
                padding: '4px 0',
              }}>
                AI-Powered Work Simulation
              </div>

              <h1 className="font-display animate-fadeIn" style={{
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
                marginBottom: 24,
                animationDelay: '60ms',
              }}>
                Experience your first<br />day at work —<br />
                <span style={{ color: 'var(--accent)' }}>before it happens</span>
              </h1>

              <p style={{
                fontSize: '1.1rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.75,
                maxWidth: 520,
                marginBottom: 36,
                animation: 'fadeIn 0.5s 120ms both',
              }}>
                Step into real workplace scenarios with AI teammates. Complete tasks, handle pressure, and get a performance report — all before your first real job.
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40, animation: 'fadeIn 0.5s 180ms both' }}>
                <button
                  className="btn btn-accent btn-lg"
                  id="landing-start-btn"
                  onClick={handleGuest}
                  style={{ minWidth: 180 }}
                >
                  Start Simulation
                </button>
                <button
                  className="btn btn-ghost btn-lg"
                  id="landing-howitworks-btn"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  style={{ minWidth: 180 }}
                >
                  See how it works
                </button>
              </div>
            </>
          )}

          {/* Trust stats — 13px, text-secondary color, no icon accent */}
          <div style={{
            display: 'flex',
            gap: 24,
            flexWrap: 'wrap',
            animation: 'fadeIn 0.5s 240ms both',
          }}>
            {[
              { Icon: BuildingIcon, label: '5 Roles Available' },
              { Icon: BrainIcon,    label: 'AI-Powered Feedback' },
              { Icon: UsersIcon,    label: 'Real Workplace Scenarios' },
            ].map(({ Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-secondary)', opacity: 0.7, display: 'flex' }}><Icon /></span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right 50% — Hero Illustration */}
        <div style={{ flex: '0 0 50%', animation: 'fadeIn 0.6s 300ms both', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src="/hero-illustration.png" 
            alt="Human collaborating with AI teammate" 
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.25))',
              transition: 'transform 0.3s ease, filter 0.3s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.filter = 'drop-shadow(0 20px 32px rgba(196,131,74,0.2))';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.filter = 'drop-shadow(0 12px 24px rgba(0,0,0,0.25))';
            }}
          />
        </div>
      </section>

      {/* ── ROLES SECTION ───────────────────────────────────── */}
      <section style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '80px 48px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{
              fontSize: '0.72rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'var(--text-tertiary)', marginBottom: 12,
            }}>
              Choose Your Role
            </div>
            <h2 className="font-display" style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
              fontWeight: 800, letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
            }}>
              A full workday. Zero risk.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {ROLE_CARDS.map((role, i) => (
              <RoleCard
                key={role.id}
                role={role}
                delay={i * 80}
                onStart={handleGuest}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '80px 48px', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{
              fontSize: '0.72rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'var(--text-tertiary)', marginBottom: 12,
            }}>
              How It Works
            </div>
            <h2 className="font-display" style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
              fontWeight: 800, letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
            }}>
              Four steps to real readiness
            </h2>
          </div>

          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
            {/* Connecting line */}
            <div style={{
              position: 'absolute',
              top: 28,
              left: 'calc(12.5% + 16px)',
              right: 'calc(12.5% + 16px)',
              height: 1,
              background: 'var(--border)',
              zIndex: 0,
            }} />

            {HOW_IT_WORKS.map((step) => (
              <div key={step.n} style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <span className="font-display" style={{
                    fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)',
                  }}>
                    {step.n}
                  </span>
                </div>
                <h3 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────── */}
      <section style={{
        padding: '80px 48px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{
              fontSize: '0.72rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'var(--text-tertiary)', marginBottom: 12,
            }}>
              What Users Say
            </div>
            <h2 className="font-display" style={{
              fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
              fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)',
            }}>
              Built for the moment before it matters
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: '1.5rem', color: 'var(--accent)', lineHeight: 1, fontFamily: 'Georgia, serif' }}>"</div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.75, flex: 1 }}>
                  {t.quote}
                </p>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  — {t.author}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '28px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-primary)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
          Work<span style={{ color: 'var(--accent)' }}>Pod</span>
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          Built for the next generation of professionals
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          &copy; {new Date().getFullYear()} WorkPod
        </span>
      </footer>

      {/* ── AUTH MODAL ──────────────────────────────────────── */}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="card" style={{
            width: '100%', maxWidth: 420, padding: 40,
            animation: 'slideUp 0.3s both',
          }} onClick={e => e.stopPropagation()}>
            <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>
              {modal === 'login' ? 'Welcome back' : 'Join WorkPod'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: '0.9rem' }}>
              {modal === 'login'
                ? 'Sign in to save your sessions and track progress.'
                : 'Create an account to save your performance history.'}
            </p>

            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {modal === 'register' && (
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Full Name</label>
                  <input className="input" id="auth-name-input" placeholder="Alex Johnson"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
              )}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email</label>
                <input className="input" id="auth-email-input" type="email" placeholder="you@company.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Password</label>
                <input className="input" id="auth-password-input" type="password" placeholder="••••••••"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>

              {error && (
                <p style={{ color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  {error}
                </p>
              )}

              <button className="btn btn-accent" id="auth-submit-btn" type="submit" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? <span className="spinner" /> : modal === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="divider" style={{ margin: '24px 0' }} />
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {modal === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => setModal(modal === 'login' ? 'register' : 'login')}
                style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                {modal === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
            <p style={{ textAlign: 'center', marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" id="auth-guest-btn" onClick={handleGuest} style={{ width: '100%' }}>
                Continue as Guest
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Role Card ──────────────────────────────────────────────────────
function RoleCard({ role, delay, onStart }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="card"
      style={{
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        animation: `slideUp 0.5s ${delay}ms both`,
        cursor: 'default',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? `0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px ${role.accent}30` : 'var(--shadow-sm)',
        borderColor: hovered ? `${role.accent}40` : 'var(--border)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: role.accent,
        opacity: hovered ? 1 : 0.6,
        transition: 'opacity 0.2s',
      }} />

      {/* Role icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${role.accent}15`,
        border: `1px solid ${role.accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16, color: role.accent,
      }}>
        <CodeIcon />
      </div>

      <h3 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        {role.title}
      </h3>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 20, fontWeight: 500 }}>
        {role.subtitle}
      </div>

      {/* Tasks */}
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {role.tasks.map(t => (
          <li key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: role.accent, marginTop: 2, flexShrink: 0 }}><CheckCircleIcon /></span>
            {t}
          </li>
        ))}
      </ul>

      {/* Difficulty */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: '0.72rem', fontWeight: 600,
          color: role.accent,
          background: `${role.accent}12`,
          padding: '3px 10px', borderRadius: 20,
        }}>
          {role.difficulty}
        </span>
      </div>

      <button
        className="btn"
        id={`landing-role-${role.id}-btn`}
        onClick={onStart}
        style={{
          background: role.accent,
          color: '#fff',
          border: 'none',
          width: '100%',
          justifyContent: 'space-between',
          marginTop: 'auto',
        }}
      >
        Start this role
        <ChevronRight />
      </button>
    </div>
  );
}
