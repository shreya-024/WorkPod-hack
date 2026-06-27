import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../store/useSimStore.js';
import ThemeToggle from './ThemeToggle.jsx';

export default function Navbar({ onSignIn, onGetStarted, showAuth = true, rightContent }) {
  const navigate = useNavigate();
  const { logout } = useSimStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const userId = localStorage.getItem('wpod_userId');
  const userName = localStorage.getItem('wpod_name') || '';
  const isLoggedIn = !!userId;
  const initials = userName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
    window.location.reload(); // refresh to reset any stale state
  };

  const navLinks = [
    { label: '📊 Dashboard',   path: '/dashboard' },
    { label: '🗂️ Portfolio',    path: '/portfolio' },
    { label: '🏆 Leaderboard', path: '/leaderboard' },
  ];

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 48px',
      height: 64,
      borderBottom: '1px solid var(--border)',
      background: 'rgba(var(--bg-secondary-raw, 10,10,15), 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
    }}>
      {/* Wordmark */}
      <button
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0, padding: 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Work<span style={{ color: 'var(--accent)' }}>Pod</span>
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)', opacity: 0.8, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 2 }}>
            @ Jalebi
          </span>
        </div>
      </button>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {rightContent}

        {showAuth && (
          <>
            {isLoggedIn ? (
              /* ── Profile dropdown ── */
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  id="nav-profile-btn"
                  onClick={() => setDropdownOpen(o => !o)}
                  title={userName}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--accent)',
                    color: '#fff',
                    border: '2px solid var(--accent-hover)',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.02em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    boxShadow: dropdownOpen ? '0 0 0 3px var(--accent-muted)' : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {initials}
                </button>

                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '8px',
                    minWidth: 220,
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 100,
                    animation: 'slideUp 0.15s both',
                  }}>
                    {/* User info header */}
                    <div style={{
                      padding: '10px 14px 12px',
                      borderBottom: '1px solid var(--border)',
                      marginBottom: 6,
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {userName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        Signed in
                      </div>
                    </div>

                    {/* Nav links */}
                    {navLinks.map(({ label, path }) => (
                      <button
                        key={path}
                        id={`nav-dropdown-${path.replace('/', '')}`}
                        onClick={() => { navigate(path); setDropdownOpen(false); }}
                        style={{
                          display: 'block', width: '100%',
                          padding: '9px 14px',
                          textAlign: 'left',
                          background: 'none', border: 'none',
                          cursor: 'pointer', borderRadius: 8,
                          fontSize: '0.88rem', fontWeight: 500,
                          color: 'var(--text-secondary)',
                          transition: 'background 0.12s, color 0.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        {label}
                      </button>
                    ))}

                    {/* Sign out */}
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
                      <button
                        id="nav-signout-btn"
                        onClick={handleLogout}
                        style={{
                          display: 'block', width: '100%',
                          padding: '9px 14px',
                          textAlign: 'left',
                          background: 'none', border: 'none',
                          cursor: 'pointer', borderRadius: 8,
                          fontSize: '0.88rem', fontWeight: 500,
                          color: 'var(--danger)',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Guest: Sign In + Get Started ── */
              <>
                {onSignIn && (
                  <button className="btn btn-ghost btn-sm" id="nav-signin-btn" onClick={onSignIn}>
                    Sign In
                  </button>
                )}
                {onGetStarted && (
                  <button className="btn btn-accent btn-sm" id="nav-getstarted-btn" onClick={onGetStarted}>
                    Get Started
                  </button>
                )}
              </>
            )}
          </>
        )}

        <ThemeToggle />
      </div>
    </nav>
  );
}
