import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../store/useSimStore.js';
import { ROLES } from '../scenarios/index.js';
import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar.jsx';

const BookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);
const TargetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);
const ZapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const WarnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const ExternalLinkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const MessageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const MapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
);
const TrendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
);

const ROADMAP_ICONS = [BookIcon, TargetIcon, ZapIcon];

function useCountUp(target, duration = 1500) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * ease));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

function DeltaBadge({ current, previous }) {
  if (previous == null) return null;
  const diff = current - previous;
  if (diff === 0) return (
    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', marginLeft: 8 }}>= same as last</span>
  );
  const up = diff > 0;
  return (
    <span style={{ fontSize: '0.72rem', fontWeight: 700, marginLeft: 8, color: up ? 'var(--success)' : 'var(--danger)' }}>
      {up ? '↑' : '↓'} {Math.abs(diff)} vs last
    </span>
  );
}

function ScoreBar({ label, value, color, prevValue }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 200);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
          <DeltaBadge current={value} previous={prevValue} />
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color }}>{value}%</span>
      </div>
      <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99, background: color, width: `${width}%`,
          transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)', boxShadow: `0 0 8px ${color}60`,
        }} />
      </div>
      {prevValue != null && (
        <div style={{ position: 'relative', height: 4, marginTop: 2 }}>
          <div style={{
            position: 'absolute', left: `${prevValue}%`, width: 2, height: 8,
            background: 'var(--text-tertiary)', borderRadius: 99, top: -4, opacity: 0.5, transform: 'translateX(-50%)',
          }} />
        </div>
      )}
    </div>
  );
}

function ScoreGauge({ score, prevScore }) {
  const animated = useCountUp(score, 1400);
  const color = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
  const label = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Work';
  const r = 70;
  const cx = 90, cy = 90;
  const circumference = Math.PI * r;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="180" height="104" viewBox="0 0 180 104">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--bg-tertiary)" strokeWidth="14" strokeLinecap="round" />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-primary)" fontSize="28" fontWeight="800" fontFamily="Syne, sans-serif">{animated}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill={color} fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">{label}</text>
      </svg>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', marginTop: 0 }}>Overall Score</p>
      {prevScore != null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20,
          background: score >= prevScore ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${score >= prevScore ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          fontSize: '0.78rem', fontWeight: 700, color: score >= prevScore ? 'var(--success)' : 'var(--danger)',
        }}>
          <TrendIcon />
          {score >= prevScore ? '+' : ''}{score - prevScore} vs last session ({prevScore})
        </div>
      )}
    </div>
  );
}

function SessionComparison({ current, previous }) {
  if (!previous) return null;
  const metrics = [
    { label: 'Overall', curr: current.overallScore, prev: previous.overallScore },
    { label: 'Communication', curr: current.communication, prev: previous.communication },
    { label: 'Task Mgmt', curr: current.taskManagement, prev: previous.taskManagement },
    { label: 'Pressure', curr: current.pressureHandling, prev: previous.pressureHandling },
  ];
  return (
    <div className="card animate-slideUp" style={{ marginBottom: 20, animationDelay: '120ms' }}>
      <h3 className="font-display" style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
        <span style={{ color: 'var(--accent)' }}><TrendIcon /></span>
        vs Your Last Session
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {metrics.map(({ label, curr, prev }) => {
          const diff = curr - prev;
          const up = diff > 0;
          const same = diff === 0;
          const color = same ? 'var(--text-tertiary)' : up ? 'var(--success)' : 'var(--danger)';
          return (
            <div key={label} style={{
              textAlign: 'center', padding: '16px 8px', background: 'var(--bg-tertiary)', borderRadius: 12,
              border: `1px solid ${same ? 'var(--border)' : up ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontWeight: 800, fontSize: '1.4rem', color, fontFamily: 'var(--font-display)' }}>
                {same ? '=' : up ? '+' : ''}{diff}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{prev} → {curr}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportPage() {
  const navigate = useNavigate();
  const { report, reportSaved, role, scenario, resetSim } = useSimStore();
  const roleInfo = ROLES.find(r => r.id === role);
  const [prevReport, setPrevReport] = useState(null);

  useEffect(() => {
    if (!report) return;
    const stored = localStorage.getItem('wpod_last_report');
    if (stored) {
      try { setPrevReport(JSON.parse(stored)); } catch {}
    }
    localStorage.setItem('wpod_last_report', JSON.stringify({
      overallScore: report.overallScore,
      communication: report.communication,
      taskManagement: report.taskManagement,
      pressureHandling: report.pressureHandling,
    }));
  }, [report]);

  const handlePlayAgain = () => {
    resetSim();
    navigate('/select');
  };

  if (!report) return null;

  const subScoreColor = (v) => v >= 70 ? 'var(--success)' : v >= 45 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar showAuth={false} rightContent={
        <button className="btn btn-ghost btn-sm" id="report-play-again-top" onClick={handlePlayAgain}>Try Another Role</button>
      } />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div className="animate-fadeIn" style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="badge badge-success" style={{ marginBottom: 16 }}>Session Complete</div>
          <h1 className="font-display" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 10 }}>
            Your Performance Report
          </h1>
          {role && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              {roleInfo?.label} · {scenario?.teamName} · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          {!reportSaved && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '8px 16px', background: 'rgba(240,165,0,0.1)', border: '1px solid rgba(240,165,0,0.25)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--warning)' }}>
              <WarnIcon />
              Guest mode — this report will not be saved. Create an account to track progress.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div className="card animate-slideUp" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <ScoreGauge score={report.overallScore} prevScore={prevReport?.overallScore} />
          </div>
          <div className="card animate-slideUp" style={{ animationDelay: '80ms' }}>
            <h3 className="font-display" style={{ fontWeight: 700, marginBottom: 24, fontSize: '1rem', color: 'var(--text-primary)' }}>Skill Breakdown</h3>
            <ScoreBar label="Communication"     value={report.communication}    color={subScoreColor(report.communication)}    prevValue={prevReport?.communication} />
            <ScoreBar label="Task Management"   value={report.taskManagement}   color={subScoreColor(report.taskManagement)}   prevValue={prevReport?.taskManagement} />
            <ScoreBar label="Pressure Handling" value={report.pressureHandling} color={subScoreColor(report.pressureHandling)} prevValue={prevReport?.pressureHandling} />
          </div>
        </div>

        <SessionComparison current={report} previous={prevReport} />

        {report.feedback?.length > 0 && (
          <div className="card animate-slideUp" style={{ marginBottom: 20, animationDelay: '160ms' }}>
            <h3 className="font-display" style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--accent)' }}><MessageIcon /></span>
              AI Feedback
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {report.feedback.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 10, borderLeft: '3px solid var(--accent)' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0, marginTop: 1, fontFamily: 'var(--font-display)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>{f}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.roadmap?.length > 0 && (
          <div className="card animate-slideUp" style={{ marginBottom: 40, animationDelay: '240ms' }}>
            <h3 className="font-display" style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--accent)' }}><MapIcon /></span>
              30-Day Learning Roadmap
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {report.roadmap.map((item, i) => {
                const Icon = ROADMAP_ICONS[i % ROADMAP_ICONS.length];
                return (
                  <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" id={`roadmap-item-${i}`}
                    style={{ display: 'flex', flexDirection: 'column', padding: '18px 20px', background: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border)', transition: 'all 0.2s', textDecoration: 'none', color: 'inherit' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: 12 }}>
                      <Icon />
                    </div>
                    <h4 className="font-display" style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6, color: 'var(--text-primary)' }}>{item.title}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.55, marginBottom: 12, flex: 1 }}>{item.description}</p>
                    {item.link && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        View Resource <ExternalLinkIcon />
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-accent btn-lg" id="report-play-again-btn" onClick={handlePlayAgain} style={{ minWidth: 180 }}>Try Another Role</button>
          <button className="btn btn-ghost btn-lg" onClick={() => navigate('/dashboard')} style={{ minWidth: 180 }}>View Dashboard</button>
          <button className="btn btn-ghost btn-lg" id="report-home-btn" onClick={() => navigate('/')} style={{ minWidth: 180 }}>Back to Home</button>
        </div>
        {!reportSaved && (
          <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.82rem', marginTop: 16 }}>
            Sign in to save this report and track your progress over time
          </p>
        )}
      </main>
    </div>
  );
}