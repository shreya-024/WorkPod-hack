import { create } from 'zustand';
import { nanoid } from 'nanoid';

// Persist guestId across sessions
function getOrCreateGuestId() {
  let id = localStorage.getItem('wpod_guest_id');
  if (!id) {
    id = 'guest_' + nanoid(10);
    localStorage.setItem('wpod_guest_id', id);
  }
  return id;
}

export const useSimStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────
  user: null,          // { id, email, name } for logged-in users
  token: localStorage.getItem('wpod_token') || null,
  guestId: getOrCreateGuestId(),

  setUser: (user, token) => {
    localStorage.setItem('wpod_token', token);
    localStorage.setItem('wpod_userId', user.id);
    localStorage.setItem('wpod_name', user.name);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('wpod_token');
    localStorage.removeItem('wpod_userId');
    localStorage.removeItem('wpod_name');
    set({ user: null, token: null });
  },

  // ── Theme ─────────────────────────────────────────────────
  theme: localStorage.getItem('wpod_theme') || 'dark', // 'light' | 'dark'
  setTheme: (theme) => {
    localStorage.setItem('wpod_theme', theme);
    set({ theme });
  },

  // ── Simulation ────────────────────────────────────────────
  role: null,           // 'sde' | 'hr' | 'pm'
  scenario: null,       // full scenario JSON
  roomCode: null,
  roomParticipants: [], // [{ userId, userName, isHuman }]
  teamComposition: null, // 'all-ai' | 'mix-humans' | null
  availableHumans: [],  // list of humans available to join

  setRole: (role, scenario) => set({ role, scenario }),
  setRoomCode: (code) => set({ roomCode: code }),
  setRoomParticipants: (participants) => set({ roomParticipants: participants }),
  setTeamComposition: (composition) => set({ teamComposition: composition }),
  setAvailableHumans: (humans) => set({ availableHumans: humans }),

  // ── Messages ──────────────────────────────────────────────
  messages: [],

  addMessage: (msg) => set(s => ({
    messages: [...s.messages, { ...msg, id: nanoid(6) }],
  })),

  clearMessages: () => set({ messages: [] }),

  // ── Tasks ─────────────────────────────────────────────────
  completedTasks: new Set(),

  toggleTask: (taskId) => set(s => {
    const next = new Set(s.completedTasks);
    next.has(taskId) ? next.delete(taskId) : next.add(taskId);
    return { completedTasks: next };
  }),

  // ── Timer ─────────────────────────────────────────────────
  timerSeconds: 2700,   // 45 minutes
  timerRunning: false,
  timerIntervalId: null,

  startTimer: () => {
    const { timerIntervalId } = get();
    if (timerIntervalId) return; // already running

    const id = setInterval(() => {
      const { timerSeconds, endSession } = get();
      if (timerSeconds <= 0) {
        clearInterval(id);
        set({ timerSeconds: 0, timerRunning: false, timerIntervalId: null });
        // Guard: endSession is set asynchronously by SimulationPage via setEndSessionFn.
        // If it hasn't been set yet, skip silently — the useEffect in SimulationPage
        // also watches timerSeconds === 0 and will trigger endSession from there.
        if (typeof endSession === 'function') endSession('timeout');
        return;
      }
      set({ timerSeconds: timerSeconds - 1 });
    }, 1000);

    set({ timerRunning: true, timerIntervalId: id });
  },

  stopTimer: () => {
    const { timerIntervalId } = get();
    if (timerIntervalId) clearInterval(timerIntervalId);
    set({ timerRunning: false, timerIntervalId: null });
  },

  resetTimer: () => {
    const { timerIntervalId } = get();
    if (timerIntervalId) clearInterval(timerIntervalId);
    set({ timerSeconds: 2700, timerRunning: false, timerIntervalId: null });
  },

  // ── Emergency ─────────────────────────────────────────────
  isEmergencyActive: false,
  setEmergencyActive: (val) => set({ isEmergencyActive: val }),

  // ── AI Typing ─────────────────────────────────────────────
  aiTyping: false,
  setAiTyping: (val) => set({ aiTyping: val }),

  // ── Report ────────────────────────────────────────────────
  report: null,
  reportSaved: false,
  setReport: (report, saved = false) => set({ report, reportSaved: saved }),

  // ── Session end callback (set from SimulationPage) ────────
  endSession: null,
  setEndSessionFn: (fn) => set({ endSession: fn }),

  // ── Reset entire sim ──────────────────────────────────────
  resetSim: () => {
    const { timerIntervalId } = get();
    if (timerIntervalId) clearInterval(timerIntervalId);
    set({
      role: null,
      scenario: null,
      roomCode: null,
      roomParticipants: [],
      teamComposition: null,
      availableHumans: [],
      messages: [],
      completedTasks: new Set(),
      timerSeconds: 2700,
      timerRunning: false,
      timerIntervalId: null,
      isEmergencyActive: false,
      aiTyping: false,
      report: null,
      reportSaved: false,
      endSession: null,
    });
  },
}));
