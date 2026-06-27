# WorkPod

An AI-powered workplace simulation platform. Practice real job scenarios with AI teammates, handle live emergencies, collaborate with other humans in multiplayer, and get a scored performance report powered by Groq (Llama 3.3) & Hindsight Long-Term Memory.

---

## Features

- **5 Roles** — Software Engineer, HR Manager, Product Manager, SDE Intern, ML Intern
- **AI Teammates** — Groq-powered personas (`llama-3.3-70b-versatile`) orchestrated via CascadeFlow that stay fully in character
- **Hindsight Long-Term Memory** — Remembers past user struggles, session scores, and feedback per user/role combination to personalize mentor guidance over time
- **Leaderboard & Rankings** — Aggregates historical performance metrics across users with role-based filtering and percentile tracking
- **Multiplayer** — join a room with real humans + AI, or go solo with all AI
- **Collaborative Whiteboard** — Excalidraw-based real-time synchronized canvas for visual collaboration
- **Team Meetings** — seamlessly embedded Jitsi video/audio conference rooms inside the simulation
- **Teams-Style Sidebar** — unified navigation in `ChatSidebar.jsx` showing channels, team statuses, active humans, tasks checklist, and live progress
- **Task Artifacts** — write and submit deliverables (PRD, code review, etc.) via embedded Monaco Editor
- **Emergency Scenarios** — triggered at 60% session time, requiring urgent team response (with a dedicated `EmergencyBanner` notification)
- **Mentor Channel** — separate private channel backed by Hindsight memory recall to offer contextual career coaching based on your historical journey
- **Voice Input** — speak your messages using Chrome Web Speech API
- **Theme Toggle** — switch between dark and light modes mid-session
- **AI Performance Report** — evaluated on Communication, Task Management & Pressure Handling with non-blocking memory retention
- **30-Day Learning Roadmap** — personalized, high-quality resource links generated after each session
- **Guest + Auth** — play instantly as a guest, or sign in to save simulation history
- **Premium SaaS UI** — sleek dark theme, animated gradient typography, and glowing hover states across the application

---

## Quick Start

### 1. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd client && npm install
```

### 2. Configure environment variables

**Server** — copy `.env.example` → `.env`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=any_random_secret_string
CLIENT_URL=http://localhost:5173

# LLM Model (optional — defaults to llama-3.3-70b-versatile)
LLM_MODEL=llama-3.3-70b-versatile

# Groq API keys — supply one or many for round-robin rotation & quota failover
GROQ_API_KEY=your_primary_groq_api_key
GROQ_API_KEY_1=
GROQ_API_KEY_2=
GROQ_API_KEY_3=
GROQ_API_KEY_4=
GROQ_API_KEY_5=
GROQ_API_KEY_6=

# Hindsight Memory API (Vectorize.io Cloud or Local Docker)
HINDSIGHT_BASE_URL=https://api.vectorize.io/hindsight
HINDSIGHT_API_KEY=your_hindsight_api_key
```

> The server reads all numbered key variants in order and rotates through them automatically. Any key that hits a 429 quota error is skipped and the next one is tried. Falls back to `GROQ_API_KEY` if no numbered keys are set. All LLM calls are observed via `@cascadeflow/core`.

**Client** — copy `.env.example` → `.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Run locally (two terminals)

```bash
# Terminal 1 — Server
cd server && npm run dev

# Terminal 2 — Client
cd client && npm run dev
```

Open `http://localhost:5173`

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite, React Router v6, Zustand |
| Editor / Visuals | `@excalidraw/excalidraw` (Whiteboard), `@monaco-editor/react` (Coding) |
| Meetings | Jitsi Meet iframe integration |
| Realtime | Socket.io-client / Socket.io |
| HTTP | Axios (`src/lib/api.js`) |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT (bcrypt) + guest mode (localStorage ID) |
| AI / LLM | Groq Llama 3.3 70B via `groq-sdk` & `@cascadeflow/core` (Chat, Mentor & Evaluation) |
| Long-Term Memory | `@vectorize-io/hindsight-client` (Per-user/per-role memory retention & recall) |
| Voice | Web Speech API (Chrome only) |

---

## How It Works

### 1. Role Selection
Pick a role (SDE, HR, PM, SDE Intern, ML Intern). A **Team Selection Modal** opens and queries the server in real-time for other humans already in an active room for that role. You can:
- **All AI Teammates** — solo session with AI personas only
- **Join with Humans** — join an existing room where real users are waiting (enabled only when humans are found)

### 2. Simulation
- An **Offer Letter** modal shows your project brief and deliverables before the 45-minute timer starts.
- **Teams-style navigation** — switch between `#team-general` chat, a `#whiteboard` collaborative canvas, and your private italicized **Mentor channel** (Team Lead).
- **Collaborative Whiteboard** — draw and model diagrams in real-time with Excalidraw-synced canvases.
- **Embedded Team Meetings** — click the meeting icon in the top bar to spin up an instant, face-to-face Jitsi audio/video meeting room.
- **Task Artifact Panel** — click any task in the sidebar to open a full-featured writing drawer with an integrated Monaco Code Editor, then submit your deliverables to auto-notify the team.
- **Emergency Button** — appears after 60% of session time has elapsed, triggering a crisis scenario that demands urgent team response. An `EmergencyBanner` broadcasts the alert to all participants.
- **Active Humans Count** — shown live in the sidebar roster ("In This Room") and top header.
- **Theme Toggle** — switch between dark and light modes at any point via the top bar.

### 3. Report & Long-Term Memory Evaluation
When the session ends (via manual submit or timeout), Groq reviews the full session transcript and returns:
- **Overall Score** (0–100) with an animated visual gauge
- **Skill Breakdown** — scored metrics on Communication, Task Management, and Pressure Handling
- **3 Critical AI Feedback Points** — constructive, highly specific observations of your session
- **30-Day Learning Roadmap** — 3 curated, actionable external links with custom descriptions on how to improve

> **Hindsight Retention**: Immediately following database persistence, a non-blocking task retains the session summary into Hindsight memory (`workpod_<userId>_<role>`), making your historical strengths and weaknesses available for recall in future sessions.

---

## Multiplayer

Two users picking the **same role** within a 2-minute window are auto-placed in the same room. The second user sees a live human count in the Team Selection Modal before joining.

**Socket events:**

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| Client → Server | `join-room` | `{ role, userId, userName }` | Join room by role |
| Client → Server | `get-available-humans` | `{ role }` | Request human rooms available |
| Client → Server | `set-team-composition` | `{ teamType, preferredRoom }` | Set preferences (mix-humans/all-ai) |
| Client → Server | `user-message` | `{ content, userName, channel }` | Send chat text |
| Client → Server | `emergency-trigger` | — | Trigger scenario crisis |
| Client → Server | `whiteboard-join` | `{ roomCode }` | Join Excalidraw session |
| Client → Server | `whiteboard-update` | `{ roomCode, elements }` | Send whiteboard updates |
| Client → Server | `whiteboard-sync-request` | `{ roomCode }` | Request latest whiteboard state |
| Server → Client | `room-joined` | `{ roomCode, participants, isEmergencyActive }` | Room join confirmation |
| Server → Client | `available-humans` | `{ rooms: [...] }` | List of human rooms |
| Server → Client | `room-update` | `{ participants }` | Broadcast updated room roster |
| Server → Client | `new-message` | `{ sender, senderType, content, channel, timestamp }` | Broadcast incoming chat message |
| Server → Client | `ai-typing` | `{ typing, channel }` | Teammate typing indicator status |
| Server → Client | `emergency-trigger` | `{ label, timestamp }` | Broadcast active emergency |
| Server → Client | `team-composition-update` | `{ userId, preference, totalParticipants, humanParticipants }` | Broadcast team composition change |
| Server → Client | `whiteboard-full-state` | `{ elements }` | Send full whiteboard state to joiner |
| Server → Client | `whiteboard-update` | `{ elements }` | Broadcast whiteboard changes |

---

## Project Structure

```
WorkPod/
├── client/                    # React + Vite frontend
│   ├── check_whiteboard.cjs   # Automated Puppeteer test script for whiteboard channel
│   └── src/
│       ├── lib/
│       │   └── api.js             # Axios instance pre-configured with VITE_API_URL
│       ├── pages/
│       │   ├── LandingPage.jsx
│       │   ├── RoleSelectPage.jsx   # Team selection modal + live human query
│       │   ├── SimulationPage.jsx   # Main sim UI (coordinates Chat, Whiteboard, Meetings)
│       │   └── ReportPage.jsx       # Animated performance score report
│       ├── components/
│       │   ├── Navbar.jsx              # Top navigation bar (auth, guest, links)
│       │   ├── TeamSelectionModal.jsx  # Choose AI-only or join humans
│       │   ├── TeamDisplay.jsx         # Live team roster in sidebar
│       │   ├── ChatWindow.jsx          # Message feed (supports system, user, teammates, mentor)
│       │   ├── ChatSidebar.jsx         # Consolidated Channels, Members, Tasks list, and Progress
│       │   ├── TaskArtifact.jsx        # Write-up drawer with integrated Monaco Editor
│       │   ├── SimTopBar.jsx           # Timer, room code, video meeting button, and emergency btn
│       │   ├── MeetingModal.jsx        # Video/Audio conferencing room via embedded Jitsi Meet iframe
│       │   ├── EmergencyBanner.jsx     # Full-width alert banner shown when emergency is triggered
│       │   ├── Whiteboard.jsx          # Excalidraw real-time collaborative canvas
│       │   ├── MessageBubble.jsx
│       │   ├── ThemeToggle.jsx         # Dark / light mode toggle
│       │   ├── TypingIndicator.jsx
│       │   └── VoiceBtn.jsx
│       ├── hooks/
│       │   ├── useSocket.js    # Socket.io connection + whiteboard & room events
│       │   └── useVoice.js     # Web Speech API
│       ├── store/
│       │   └── useSimStore.js  # Zustand global simulation state
│       └── scenarios/
│           ├── sde.json
│           ├── hr.json
│           ├── pm.json
│           ├── ml_intern.json
│           └── sde_intern.json
│
└── server/                    # Express + Socket.io backend
    ├── index.js               # App entry, CORS, routes, socket init, and Jitsi room links
    ├── socket/
    │   └── roomManager.js     # All socket logic, multiplayer rooms, Excalidraw synchronization
    ├── services/
    │   ├── groqService.js     # Groq + CascadeFlow calls: Chat, Mentor, and Evaluation models
    │   └── hindsightService.js # Hindsight client: long-term retain() and recall() operations
    ├── controllers/
    │   ├── authController.js
    │   ├── sessionController.js # Session evaluation + non-blocking Hindsight memory retain
    │   ├── roomController.js
    │   └── leaderboardController.js # Aggregates user scores, percentiles, and best rankings
    ├── middleware/            # Auth middleware (JWT verification)
    ├── config/               # DB connection and config helpers
    ├── models/               # Mongoose schemas: User, Session
    ├── routes/
    │   ├── authRoutes.js
    │   ├── sessionRoutes.js
    │   ├── roomRoutes.js
    │   └── leaderboardRoutes.js # GET /api/leaderboard and /api/leaderboard/me/:userId
    └── scenarios/            # Server-side scenario JSON files (with specialized mentorPrompts)
```

---

## REST API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, returns JWT |
| POST | `/api/session/end` | Optional | Evaluate session, save if logged in & retain memory |
| GET | `/api/session/history/:userId` | JWT | Past sessions |
| GET | `/api/leaderboard` | — | Get top users (supports `?role=sde&limit=20`) |
| GET | `/api/leaderboard/me/:userId` | — | Get specific user's rank and percentile |
| GET | `/api/room/count/:role` | — | Live participant count for a role |
| GET | `/api/health` | — | Server health check |

---

## AI & Memory Architecture (Groq + CascadeFlow + Hindsight)

Three core sub-systems power the simulation's intelligence:

### 1. Groq + CascadeFlow Orchestration
All LLM requests are processed through `@cascadeflow/core` in observe mode with automated key round-robin rotation (`GROQ_API_KEY_1`..`6`).
- **Teammate Chat & Mentor**: Uses `llama-3.3-70b-versatile` with low latency (`max_tokens: 300`, `temperature: 0.85`) to keep conversations snappy and realistic.
- **Session Evaluator**: Uses structured JSON output enforcement (`temperature: 0.4`) to extract precise grading metrics and actionable learning roadmaps.

### 2. Hindsight Long-Term Memory
Powered by `@vectorize-io/hindsight-client`, memory banks are scoped strictly to the user and role (`workpod_<userId>_<role>`).
- **Retain Phase**: When a simulation ends, `retainSessionMemory()` saves key metadata (scores, completed tasks, emergency handling, and feedback).
- **Recall Phase**: When interacting with the AI Mentor, `recallMemories()` searches historical sessions and injects context directly into the prompt so the mentor gives tailored advice based on past growth.

### 3. System Guardrails
- **Workplace Guardrails** — Pre-appended to every chat interaction to prevent off-topic tangents or jailbreak attempts.
- **Mentor Context Injection** — Automatically merges recalled historical struggles with scenario career coaching instructions.

---

## Known Limitations

- Rooms expire/reset if all human participants disconnect
- No persistent room rejoining or state recovery after page refresh
- Voice input is Google Chrome-only (Web Speech API)
- Emergency scenario can only be triggered once per session
- Guest simulation reports are shown immediately but not saved in database history
