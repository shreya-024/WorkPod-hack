import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../store/useSimStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { useVoice } from '../hooks/useVoice.js';
import ChatWindow from '../components/ChatWindow.jsx';
import ChatSidebar from '../components/ChatSidebar.jsx';
import TaskArtifact from '../components/TaskArtifact.jsx';
import EmergencyBanner from '../components/EmergencyBanner.jsx';
import VoiceBtn from '../components/VoiceBtn.jsx';
import TypingIndicator from '../components/TypingIndicator.jsx';
import SimTopBar from '../components/SimTopBar.jsx';
import TeamDisplay from '../components/TeamDisplay.jsx';
import api from '../lib/api.js';
import Whiteboard from '../components/Whiteboard.jsx';

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function SimulationPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [ending, setEnding] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showOfferLetter, setShowOfferLetter] = useState(true);
  const [chatChannel, setChatChannel] = useState('team');
  const [selectedTask, setSelectedTask] = useState(null);
  const inputRef = useRef(null);

  const {
    role, scenario, roomCode, messages, aiTyping,
    timerSeconds, startTimer, stopTimer,
    isEmergencyActive, setEmergencyActive,
    completedTasks, user, guestId,
    setReport, setEndSessionFn,
    theme, setTheme,
    roomParticipants,
    teamComposition,
  } = useSimStore();

  // Sync theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const { sendMessage, triggerEmergency } = useSocket();

  // Start timer after offer letter accepted
  useEffect(() => {
    if (!showOfferLetter) startTimer();
  }, [showOfferLetter, startTimer]);

  const elapsed = 2700 - timerSeconds;
  const showEmergencyBtn = elapsed >= 180 && !isEmergencyActive; // show after 3 mins

  useEffect(() => {
    if (timerSeconds === 0) endSession('timeout');
  }, [timerSeconds]);

  const endSession = useCallback(async (reason = 'manual') => {
    if (ending) return;
    setEnding(true);
    stopTimer();

    const durationSeconds = 2700 - timerSeconds;
    const payload = {
      userId: user?.id || guestId,
      guestId,
      role,
      roomId: roomCode || 'solo',
      messages: messages.map(m => ({
        sender: m.sender,
        senderType: m.senderType,
        content: m.content,
        timestamp: m.timestamp,
      })),
      tasksCompleted: [...completedTasks],
      emergencyTriggered: isEmergencyActive,
      durationSeconds,
      totalTasks: scenario?.tasks?.length || 4,
    };

    try {
      const { data } = await api.post('/api/session/end', payload);
      setReport(data.report, data.saved);
      navigate('/report');
    } catch (err) {
      console.error('End session error:', err);
      setReport({
        overallScore: 55,
        communication: 55,
        taskManagement: Math.min(completedTasks.size * 25, 100),
        pressureHandling: isEmergencyActive ? 60 : 45,
        feedback: ['Session could not be evaluated — server error.', 'Your data was not saved.', 'Please try again.'],
        roadmap: [],
      }, false);
      navigate('/report');
    }
  }, [ending, timerSeconds, messages, completedTasks, isEmergencyActive, role, roomCode, user, guestId]);

  useEffect(() => { setEndSessionFn(endSession); }, [endSession]);

  const handleSend = (text) => {
    const msg = (text || input).trim();
    if (!msg || aiTyping) return;
    const channel = chatChannel === 'whiteboard' ? 'team' : chatChannel;
    sendMessage(msg, channel);
    if (!text) setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceResult = useCallback((transcript) => {
    setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    inputRef.current?.focus();
  }, []);

  const handleEmergency = () => {
    setEmergencyActive(true);
    triggerEmergency();
  };

  const handleTaskSubmit = ({ role, taskId, content }) => {
    const { toggleTask } = useSimStore.getState();
    toggleTask(taskId);
    // Find the task title for a clean notification message
    const task = scenario?.tasks?.find(t => t.id === taskId);
    const taskTitle = task?.title || 'a task';
    const autoMessage = `I've just submitted my work for "${taskTitle}". Please review when you get a chance!`;
    sendMessage(autoMessage, 'team');
    setSelectedTask(null);
  };

  // Quick send from ChatWindow starter buttons
  const handleQuickSend = (text) => {
    if (!text || aiTyping) return;
    const channel = chatChannel === 'whiteboard' ? 'team' : chatChannel;
    sendMessage(text, channel);
  };

  if (!scenario) return null;

  const isWhiteboard = chatChannel === 'whiteboard';

  // Chat header label
  const channelLabel = isWhiteboard
    ? 'whiteboard'
    : chatChannel === 'mentor'
      ? (scenario.mentorName || 'Team Lead')
      : 'team-general';

  return (
    <>
    <div className="sim-layout">
      {/* TOP BAR */}
      <SimTopBar
        scenario={scenario}
        roomCode={roomCode}
        roomParticipants={roomParticipants}
        timerSeconds={timerSeconds}
        onEndSession={() => setShowEndConfirm(true)}
        onEmergency={handleEmergency}
        showEmergencyBtn={showEmergencyBtn}
        role={role}
      />

      {/* CONTENT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Left: Channels + Team */}
        <ChatSidebar
          scenario={scenario}
          chatChannel={chatChannel}
          onChannelChange={setChatChannel}
          onTaskClick={(id, title) => setSelectedTask({ id, title })}
        />

        {/* Main chat / whiteboard */}
        <main className="sim-main">
          {isEmergencyActive && (
            <EmergencyBanner label={scenario.emergencyLabel} />
          )}

          {isWhiteboard ? (
            /* WHITEBOARD view */
            <div style={{
              flex: 1, overflow: 'hidden', minHeight: 0,
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', gap: 8,
                flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                  <path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
                </svg>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  whiteboard
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                  Collaborative drawing
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <Whiteboard />
              </div>
            </div>
          ) : (
            /* CHAT view */
            <>
              <div style={{
                flex: 1, overflow: 'hidden', minHeight: 0,
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Chat header */}
                <div style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  flexShrink: 0,
                }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>#</span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {channelLabel}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                    {scenario.members?.length} members
                  </span>
                </div>

                <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                  <ChatWindow
                    messages={messages.filter(m => {
                      if (m.senderType === 'system') return true; // system msgs show everywhere
                      if (chatChannel === 'mentor') {
                        // mentor tab: only mentor replies and the user messages sent to mentor
                        return m.senderType === 'mentor' || (m.senderType === 'user' && m.channel === 'mentor');
                      } else {
                        // team tab: only ai + user messages that belong to team channel
                        return m.senderType === 'ai' || (m.senderType === 'user' && m.channel !== 'mentor');
                      }
                    })}
                    scenario={scenario}
                    onQuickSend={handleQuickSend}
                  />
                </div>
              </div>

              {/* Typing indicator — only show in the channel that is actively typing */}
              {aiTyping && aiTyping === chatChannel && (
                <div style={{ padding: '6px 20px', flexShrink: 0 }}>
                  <TypingIndicator
                    members={chatChannel === 'mentor'
                      ? [{ name: scenario.mentorName || 'Team Lead', color: '#0a66c2' }]
                      : scenario.members
                    }
                  />
                </div>
              )}

              {/* Input bar — Teams style */}
              <div style={{
                padding: '8px 12px 10px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                flexShrink: 0,
              }}>
                <div style={{
                  display: 'flex', gap: 6, alignItems: 'flex-end',
                }}>
                  <textarea
                    ref={inputRef}
                    id="chat-input"
                    placeholder={chatChannel === 'mentor'
                      ? `Ask ${scenario.mentorName || 'Team Lead'} a question...`
                      : `Message #team-general...`}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    style={{
                      flex: 1,
                      background: 'var(--input-bg, var(--bg-tertiary))',
                      border: '1px solid var(--input-border, var(--border))',
                      borderRadius: 8,
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-base)',
                      fontSize: '0.875rem',
                      resize: 'none',
                      lineHeight: 1.5,
                      padding: '7px 12px',
                      maxHeight: '5rem',
                      overflowY: 'auto',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#0a66c2'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--input-border, var(--border))'; }}
                    onInput={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
                    }}
                  />
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0, paddingBottom: 1 }}>
                    <VoiceBtn onResult={handleVoiceResult} />
                    <button
                      id="send-message-btn"
                      onClick={() => handleSend()}
                      disabled={!input.trim() || aiTyping}
                      style={{
                        width: 32, height: 32, borderRadius: 6, border: 'none',
                        background: input.trim() && !aiTyping ? '#0a66c2' : 'var(--bg-tertiary)',
                        color: input.trim() && !aiTyping ? '#fff' : 'var(--text-tertiary)',
                        cursor: input.trim() && !aiTyping ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s', flexShrink: 0,
                      }}
                    >
                      <SendIcon />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 4, paddingLeft: 2 }}>
                  Enter to send · Shift+Enter for newline · Chrome for voice
                </p>
              </div>
            </>
          )}
        </main>
      </div>

      {/* TASK ARTIFACT PANEL (right side panel) */}
      {selectedTask && (
        <div
          className="overlay"
          onClick={() => setSelectedTask(null)}
          style={{ justifyContent: 'flex-end' }}
        >
          <div style={{
            width: '50%', maxWidth: 700, height: '100%',
            background: 'var(--bg-secondary)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideRight 0.25s ease-out',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
            position: 'relative',
          }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedTask(null)}
              style={{
                position: 'absolute', top: 14, right: 14, zIndex: 10,
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                width: 30, height: 30, borderRadius: 6,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)',
              }}
              title="Close"
            >
              <CloseIcon />
            </button>
            <TaskArtifact
              role={role}
              taskId={selectedTask.id}
              taskTitle={selectedTask.title}
              onSubmit={handleTaskSubmit}
            />
          </div>
        </div>
      )}

      {/* END CONFIRM MODAL */}
      {showEndConfirm && (
        <div className="overlay" onClick={() => setShowEndConfirm(false)}>
          <div className="card" style={{ maxWidth: 400, width: '100%', padding: 36, animation: 'slideUp 0.25s both' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>
              End simulation?
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem', lineHeight: 1.6 }}>
              Your session will be evaluated by AI and you'll receive a detailed performance report.
              {!user && <span style={{ color: 'var(--warning)', display: 'block', marginTop: 8 }}>Not saved — you're in guest mode.</span>}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowEndConfirm(false)}>
                Keep going
              </button>
              <button id="confirm-end-btn" className="btn btn-accent" style={{ flex: 1 }}
                onClick={() => { setShowEndConfirm(false); endSession('manual'); }}
                disabled={ending}>
                {ending ? <span className="spinner" /> : 'Get Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFER LETTER */}
      {showOfferLetter && (
        <div className="overlay">
          <div className="card" style={{ maxWidth: 720, width: '100%', padding: 36, maxHeight: '90vh', overflowY: 'auto' }}>
            <span className="badge badge-primary" style={{ marginBottom: 14, display: 'inline-block' }}>Offer Letter</span>
            <h2 className="font-display" style={{ fontSize: '1.45rem', fontWeight: 700, marginBottom: 8 }}>
              Welcome to {scenario.teamName}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: '0.9rem', lineHeight: 1.6 }}>
              You are joining as <strong style={{ color: 'var(--text-primary)' }}>{scenario.label}</strong>. Review your project scope and deliverables before starting.
            </p>

            <div style={{ marginBottom: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-tertiary)' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>
                Project Brief
              </p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                {scenario.projectBrief || `You are part of ${scenario.teamName}. Complete sprint tasks, collaborate with teammates, and handle escalation scenarios under time pressure.`}
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontWeight: 600 }}>
                Initial Deliverables
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scenario.tasks.map(t => (
                  <div key={t.id} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 3 }}>{t.meta}</div>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.6 }}>
              Need clarification anytime? Switch to <strong style={{ color: 'var(--text-primary)' }}>
                Ask {scenario.mentorName || 'Team Lead'}
              </strong> in the sidebar to ask questions.
            </p>

            <button className="btn btn-accent" onClick={() => setShowOfferLetter(false)} style={{ width: '100%', padding: 14 }}>
              Accept Offer &amp; Start Simulation
            </button>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {ending && (
        <div className="overlay" style={{ flexDirection: 'column', gap: 20 }}>
          <div className="spinner" style={{ width: 44, height: 44, borderWidth: 3 }} />
          <p className="font-display" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Analyzing your performance...
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            AI is reviewing your session transcript
          </p>
        </div>
      )}
    </div>
    </>
  );
}
