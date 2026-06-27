import { nanoid } from 'nanoid';
import { callLLM, callMentorLLM } from '../services/groqService.js';
import { recallMemories } from '../services/hindsightService.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Scenario loader ─────────────────────────────────────────────────────────
function loadScenario(role) {
  const raw = readFileSync(join(__dirname, `../scenarios/${role}.json`), 'utf-8');
  return JSON.parse(raw);
}

// roomCode -> RoomState
const rooms = new Map();

// ─── Room message log (for replay on rejoin) ─────────────────────────────────
// Stored inside each room as room.messageLog[]
const REPLAY_COUNT = 20; // last N messages replayed to rejoining users
const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000; // 5 minutes before an empty room is deleted

function getOrCreateRoom(role, teamType) {
  // If user wants 'mix-humans', find an existing non-full room for this role
  if (teamType === 'mix-humans') {
    for (const [code, room] of rooms.entries()) {
      if (room.role === role && room.teamType === 'mix-humans' && room.participants.length < 10) {
        return room;
      }
    }
  }

  // Otherwise, create a new room (either because 'all-ai' or no 'mix-humans' room found)
  const scenario = loadScenario(role);
  const code = `${role}-${nanoid(6)}`;
  const room = {
    role,
    code,
    teamType,             // store whether this room is mix-humans or all-ai
    history: [],
    mentorHistory: [],
    participants: [],
    messageLog: [],       // full ordered chat log for replay
    whiteboardElements: [],  // collaborative whiteboard state
    scenario,
    systemPrompt: scenario.systemPrompt,
    emergencyPrompt: scenario.emergencyPrompt,
    emergencyLabel: scenario.emergencyLabel,
    isEmergencyActive: false,
    aiTyping: false,
    createdAt: Date.now(),
    emptyTtlTimer: null,  // set when last participant leaves
  };
  rooms.set(code, room);

  return room;
}

/** Append a message to room.messageLog, keeping last REPLAY_COUNT entries. */
function logMessage(room, msg) {
  room.messageLog.push(msg);
  if (room.messageLog.length > REPLAY_COUNT) {
    room.messageLog = room.messageLog.slice(room.messageLog.length - REPLAY_COUNT);
  }
}

/** Cancel any pending empty-room TTL timer on a room. */
function cancelEmptyTimer(room) {
  if (room.emptyTtlTimer) {
    clearTimeout(room.emptyTtlTimer);
    room.emptyTtlTimer = null;
  }
}

/** Schedule room deletion after TTL if it stays empty. */
function scheduleEmptyTimer(room) {
  cancelEmptyTimer(room);
  room.emptyTtlTimer = setTimeout(() => {
    if (room.participants.length === 0) {
      rooms.delete(room.code);
    }
  }, EMPTY_ROOM_TTL_MS);
}

// ─── Socket manager ───────────────────────────────────────────────────────────
export function initRoomManager(io) {
  io.on('connection', (socket) => {
    let currentRoom = null;
    let currentUser = null;

    // ─── JOIN ROOM ──────────────────────────────────────────────────────────
    socket.on('join-room', ({ role, userId, userName, teamType }) => {
      if (!['sde', 'hr', 'pm', 'ml_intern', 'sde_intern'].includes(role)) return;

      const room = getOrCreateRoom(role, teamType);
      currentRoom = room;
      currentUser = {
        userId,
        userName: userName || 'User',
        socketId: socket.id,
        isHuman: true,
        joinedAt: new Date().toISOString(),
      };

      // Cancel any pending empty-room TTL now that someone is joining
      cancelEmptyTimer(room);

      // Deduplicate by userId
      if (!room.participants.find(p => p.userId === userId)) {
        room.participants.push(currentUser);
      }

      socket.join(room.code);

      socket.emit('room-joined', {
        roomCode: room.code,
        participants: room.participants,
        isEmergencyActive: room.isEmergencyActive,
      });

      io.to(room.code).emit('room-update', { participants: room.participants });

      const joinMsg = {
        sender: 'System',
        senderType: 'system',
        content: `${currentUser.userName} joined the workspace.`,
        timestamp: new Date().toISOString(),
      };
      logMessage(room, joinMsg);
      io.to(room.code).emit('system-message', joinMsg);

      // ─── INTERN AUTO-MESSAGES ──────────────────────────────────────────────
      // For intern roles, AI teammates proactively share onboarding material
      // after a short delay, with typing indicators for realism.
      if (role === 'ml_intern') {
        // t+2s: Senior ML Engineer sends onboarding docs + dataset column table
        setTimeout(() => {
          io.to(room.code).emit('ai-typing', { typing: true, channel: 'team' });
          setTimeout(() => {
            const onboardingMsg = {
              sender: 'AI',
              senderType: 'ai',
              content: `**[Shreya]**: Welcome to Jalebi ML! 🎉 Here's your onboarding packet. Our team norms: we track every experiment in MLflow, models go through staging → canary → prod via our model registry, and we do weekly model review meetings on Fridays.\n\nHere's the Titanic dataset you'll be working with — it's at \`/datasets/titanic_sample.csv\`. Column reference:\n\n| Column | Type | Description |\n|---|---|---|\n| PassengerId | int | Unique passenger ID |\n| Survived | int (0/1) | Target variable — did they survive? |\n| Pclass | int (1-3) | Ticket class (1=1st, 2=2nd, 3=3rd) |\n| Name | string | Passenger name |\n| Sex | string | male / female |\n| Age | float | Age in years (has missing values!) |\n| SibSp | int | # siblings/spouses aboard |\n| Parch | int | # parents/children aboard |\n| Ticket | string | Ticket number |\n| Fare | float | Passenger fare |\n| Cabin | string | Cabin number (mostly missing) |\n| Embarked | char | Port of embarkation (C/Q/S) |\n\nStart with Task 1 — explore the data and note your findings. Then move on to building a pipeline.`,
              channel: 'team',
              timestamp: new Date().toISOString(),
            };
            logMessage(room, onboardingMsg);
            io.to(room.code).emit('new-message', onboardingMsg);
            io.to(room.code).emit('ai-typing', { typing: false, channel: 'team' });
          }, 1500);
        }, 2000);

        // t+5s: Data Scientist sends first 10 rows of data
        setTimeout(() => {
          io.to(room.code).emit('ai-typing', { typing: true, channel: 'team' });
          setTimeout(() => {
            const dataMsg = {
              sender: 'AI',
              senderType: 'ai',
              content: `**[Alex]**: Here's a quick peek at the first 10 rows so you can get oriented before diving into the full dataset:\n\n\`\`\`csv\nPassengerId,Survived,Pclass,Name,Sex,Age,SibSp,Parch,Ticket,Fare,Cabin,Embarked\n1,0,3,"Braund, Mr. Owen Harris",male,22,1,0,A/5 21171,7.25,,S\n2,1,1,"Cumings, Mrs. John Bradley",female,38,1,0,PC 17599,71.28,C85,C\n3,1,3,"Heikkinen, Miss. Laina",female,26,0,0,STON/O2. 3101282,7.92,,S\n4,1,1,"Futrelle, Mrs. Jacques Heath",female,35,1,0,113803,53.1,C123,S\n5,0,3,"Allen, Mr. William Henry",male,35,0,0,373450,8.05,,S\n6,0,3,"Moran, Mr. James",male,,0,0,330877,8.46,,Q\n7,0,1,"McCarthy, Mr. Timothy J",male,54,0,0,17463,51.86,E46,S\n8,0,3,"Palsson, Master. Gosta Leonard",male,2,3,1,349909,21.07,,S\n9,1,3,"Johnson, Mrs. Oscar W",female,27,0,2,347742,11.13,,S\n10,1,2,"Nasser, Mrs. Nicholas",female,14,1,0,237736,30.07,,C\n\`\`\`\n\nNotice rows 6 has a missing Age value — that's going to be important for your preprocessing step. What do you see when you look at the data distributions?`,
              channel: 'team',
              timestamp: new Date().toISOString(),
            };
            logMessage(room, dataMsg);
            io.to(room.code).emit('new-message', dataMsg);
            io.to(room.code).emit('ai-typing', { typing: false, channel: 'team' });
          }, 1500);
        }, 5000);
      }

      if (role === 'sde_intern') {
        // t+2s: Engineering Manager sends onboarding wiki
        setTimeout(() => {
          io.to(room.code).emit('ai-typing', { typing: true, channel: 'team' });
          setTimeout(() => {
            const wikiMsg = {
              sender: 'AI',
              senderType: 'ai',
              content: `**[Dipshikha]**: Welcome to the team! 🎉 Here's our onboarding wiki — please read through before picking up your first ticket.\n\n**📁 Repo Structure**\n\`\`\`\n/src\n  /api        → Express route handlers\n  /middleware → Auth, rate-limiting, logging\n  /services   → Business logic layer\n  /models     → Mongoose/Prisma schemas\n  /utils      → Shared helpers\n/tests        → Jest test suites\n\`\`\`\n\n**🔧 Local Dev Setup**: \`npm install\` → copy \`.env.example\` to \`.env\` → \`npm run dev\` (port 3000)\n\n**📋 Team Norms**\n• Daily standup at 10am — async in #standup-bot (what you did, what you'll do, blockers)\n• All PRs need 1 approval before merge\n• Write tests for any bug fix — prove it was broken, prove it's fixed\n• Branch naming: \`fix/JIRA-123-short-description\` or \`feat/JIRA-456-feature-name\`\n\n**🎫 How to Pick Tickets**: Check the "Ready for Dev" column in Jira. Assign yourself, move to "In Progress", and post in #team-general.`,
              channel: 'team',
              timestamp: new Date().toISOString(),
            };
            logMessage(room, wikiMsg);
            io.to(room.code).emit('new-message', wikiMsg);
            io.to(room.code).emit('ai-typing', { typing: false, channel: 'team' });
          }, 1500);
        }, 2000);

        // t+5s: Senior SDE sends a GitHub issue with buggy code
        setTimeout(() => {
          io.to(room.code).emit('ai-typing', { typing: true, channel: 'team' });
          setTimeout(() => {
            const issueMsg = {
              sender: 'AI',
              senderType: 'ai',
              content: `**[Jordan]**: Hey! I've assigned you your first bug. Here's the GitHub issue:\n\n**🐛 Issue #247: Login endpoint allows authentication without password verification**\n**Priority:** P0 — Security\n**Reporter:** Security audit bot\n\n**Description:** The \`/api/auth/login\` endpoint returns a valid JWT even when the password is wrong. The password hash comparison was accidentally removed in a recent refactor. Also missing: rate limiting on failed attempts.\n\n**Buggy code** (\`auth/login.ts\`):\n\`\`\`typescript\nimport { Request, Response } from 'express';\nimport jwt from 'jsonwebtoken';\nimport { findUserByEmail } from '../services/userService';\n\nexport async function loginHandler(req: Request, res: Response) {\n  const { email, password } = req.body;\n\n  if (!email || !password) {\n    return res.status(400).json({ error: 'Email and password required' });\n  }\n\n  const user = await findUserByEmail(email);\n  if (!user) {\n    return res.status(401).json({ error: 'Invalid credentials' });\n  }\n\n  // BUG: Missing password hash check!\n  // Should compare password against user.passwordHash using bcrypt\n\n  // BUG: No rate limiting on failed login attempts\n  // Should track attempts and block after 5 failures\n\n  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {\n    expiresIn: '24h',\n  });\n\n  return res.json({ token, user: { id: user.id, email: user.email } });\n}\n\`\`\`\n\nFix both bugs, then write a unit test and submit a PR description. Open Task 2 in the sidebar to start editing!`,
              channel: 'team',
              timestamp: new Date().toISOString(),
            };
            logMessage(room, issueMsg);
            io.to(room.code).emit('new-message', issueMsg);
            io.to(room.code).emit('ai-typing', { typing: false, channel: 'team' });
          }, 1500);
        }, 5000);
      }
    });

    // ─── REJOIN ROOM ────────────────────────────────────────────────────────
    // Called by the client on socket reconnect if it has a saved roomCode.
    socket.on('rejoin-room', ({ roomCode, userId, userName }) => {
      const room = rooms.get(roomCode);
      if (!room) {
        // Room expired — tell client to fall back to a fresh join
        socket.emit('rejoin-failed', { reason: 'Room no longer exists. Starting a new session.' });
        return;
      }

      currentRoom = room;
      currentUser = {
        userId,
        userName: userName || 'User',
        socketId: socket.id,
        isHuman: true,
        joinedAt: new Date().toISOString(),
      };

      // Cancel TTL and restore participant
      cancelEmptyTimer(room);
      const existing = room.participants.find(p => p.userId === userId);
      if (existing) {
        existing.socketId = socket.id; // update stale socket ID
      } else {
        room.participants.push(currentUser);
      }

      socket.join(room.code);

      // Send room-joined with the last N messages for replay
      socket.emit('room-joined', {
        roomCode: room.code,
        participants: room.participants,
        isEmergencyActive: room.isEmergencyActive,
        replayMessages: room.messageLog.slice(-REPLAY_COUNT),
      });

      io.to(room.code).emit('room-update', { participants: room.participants });

      const rejoinMsg = {
        sender: 'System',
        senderType: 'system',
        content: `${currentUser.userName} rejoined the workspace.`,
        timestamp: new Date().toISOString(),
      };
      logMessage(room, rejoinMsg);
      io.to(room.code).emit('system-message', rejoinMsg);
    });

    // ─── USER MESSAGE ───────────────────────────────────────────────────────
    socket.on('user-message', async ({ content, userName, channel = 'team' }) => {
      if (!currentRoom) return;
      const room = currentRoom;

      const userMsg = {
        sender: userName || 'You',
        senderType: 'user',
        content,
        channel,
        timestamp: new Date().toISOString(),
        socketId: socket.id,
      };
      logMessage(room, userMsg);
      io.to(room.code).emit('new-message', userMsg);

      // Guard: don't pile up AI calls
      if (room.aiTyping) return;
      room.aiTyping = true;
      io.to(room.code).emit('ai-typing', { typing: true, channel });

      try {
        const useMentor = channel === 'mentor';

        // ─── Hindsight: inject past-session memories into mentor context ──
        let enrichedContent = content;
        if (useMentor && currentUser?.userId) {
          try {
            const memories = await recallMemories(
              currentUser.userId,
              room.role,
              content,
              3,
            );
            if (memories.length > 0) {
              const memoryBlock = memories
                .map((m, i) => `[Past Session ${i + 1}]: ${m}`)
                .join('\n');
              enrichedContent = `[CONTEXT FROM PAST SESSIONS — use this to personalise your advice]:\n${memoryBlock}\n\n[CURRENT QUESTION]: ${content}`;
            }
          } catch (recallErr) {
            // Non-blocking — mentor still works without memory
            console.warn('[hindsight] Recall failed for mentor (non-blocking):', recallErr.message);
          }
        }

        const aiText = useMentor
          ? await callMentorLLM(room.mentorHistory, enrichedContent, room.scenario)
          : await callLLM(
              room.history,
              content,
              room.history.length === 0 ? room.systemPrompt : null,
            );

        if (useMentor) {
          room.mentorHistory.push({ role: 'user', parts: [{ text: content }] });
          room.mentorHistory.push({ role: 'model', parts: [{ text: aiText }] });
          if (room.mentorHistory.length > 30) {
            room.mentorHistory = room.mentorHistory.slice(room.mentorHistory.length - 30);
          }
        } else {
          room.history.push({ role: 'user', parts: [{ text: content }] });
          room.history.push({ role: 'model', parts: [{ text: aiText }] });
          if (room.history.length > 30) {
            room.history = room.history.slice(room.history.length - 30);
          }
        }

        const aiMsg = useMentor
          ? {
              sender: room.scenario.mentorName || 'Mentor',
              senderType: 'mentor',
              content: aiText,
              channel: 'mentor',
              timestamp: new Date().toISOString(),
            }
          : {
              sender: 'AI',
              senderType: 'ai',
              content: aiText,
              channel: 'team',
              timestamp: new Date().toISOString(),
            };

        logMessage(room, aiMsg);
        io.to(room.code).emit('new-message', aiMsg);
      } catch (err) {
        console.error('LLM error:', err.message);
        const errMsg = {
          sender: 'System',
          senderType: 'system',
          content: '⚠️ AI teammates are momentarily unavailable. Please try again.',
          timestamp: new Date().toISOString(),
        };
        logMessage(room, errMsg);
        io.to(room.code).emit('new-message', errMsg);
      } finally {
        room.aiTyping = false;
        io.to(room.code).emit('ai-typing', { typing: false, channel });
      }
    });

    // ─── EMERGENCY TRIGGER ──────────────────────────────────────────────────
    socket.on('emergency-trigger', async () => {
      if (!currentRoom || currentRoom.isEmergencyActive) return;
      const room = currentRoom;
      room.isEmergencyActive = true;

      io.to(room.code).emit('emergency-trigger', {
        label: room.emergencyLabel || '🚨 Emergency',
        timestamp: new Date().toISOString(),
      });

      io.to(room.code).emit('ai-typing', { typing: true });
      try {
        const aiText = await callLLM(room.history, room.emergencyPrompt, null);
        room.history.push({ role: 'user', parts: [{ text: room.emergencyPrompt }] });
        room.history.push({ role: 'model', parts: [{ text: aiText }] });
        if (room.history.length > 30) {
          room.history = room.history.slice(room.history.length - 30);
        }

        const emergencyMsg = {
          sender: 'AI',
          senderType: 'ai',
          content: aiText,
          timestamp: new Date().toISOString(),
          isEmergency: true,
        };
        logMessage(room, emergencyMsg);
        io.to(room.code).emit('new-message', emergencyMsg);
      } catch (err) {
        console.error('Emergency LLM error:', err.message);
      } finally {
        io.to(room.code).emit('ai-typing', { typing: false });
      }
    });

    // ─── GET AVAILABLE HUMANS ───────────────────────────────────────────────
    socket.on('get-available-humans', ({ role }) => {
      if (!['sde', 'hr', 'pm', 'ml_intern', 'sde_intern'].includes(role)) return;

      const availableRooms = [];
      for (const [code, room] of rooms) {
        if (room.role === role && room.teamType === 'mix-humans') {
          const humans = room.participants.filter(p => p.isHuman);
          if (humans.length > 0 && room.participants.length < 10) {
            availableRooms.push({
              roomCode: code,
              humanCount: humans.length,
              totalCount: room.participants.length,
              humans: humans.map(h => ({ userName: h.userName, joinedAt: h.joinedAt })),
            });
          }
        }
      }
      socket.emit('available-humans', { rooms: availableRooms });
    });

    // ─── SET TEAM COMPOSITION ───────────────────────────────────────────────
    socket.on('set-team-composition', ({ teamType, preferredRoom }) => {
      if (!currentRoom || !currentUser) return;
      if (!['all-ai', 'mix-humans'].includes(teamType)) return;

      if (!currentRoom.teamComposition) {
        currentRoom.teamComposition = new Map();
      }
      currentRoom.teamComposition.set(currentUser.userId, {
        preference: teamType,
        preferredRoom,
        setAt: new Date().toISOString(),
      });

      const teamInfo = {
        userId: currentUser.userId,
        preference: teamType,
        totalParticipants: currentRoom.participants.length,
        humanParticipants: currentRoom.participants.filter(p => p.isHuman).length,
      };
      io.to(currentRoom.code).emit('team-composition-update', teamInfo);
    });

    // ─── WHITEBOARD JOIN ────────────────────────────────────────────────────
    socket.on('whiteboard-join', ({ roomCode }) => {
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room) return;

      socket.join(roomCode);

      // Send existing canvas state to new joiner
      if (room.whiteboardElements && room.whiteboardElements.length > 0) {
        socket.emit('whiteboard-full-state', {
          elements: room.whiteboardElements,
        });
      }
    });

    // ─── WHITEBOARD UPDATE ──────────────────────────────────────────────────
    socket.on('whiteboard-update', ({ roomCode, elements }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      // Save latest state server-side
      room.whiteboardElements = elements;

      // Broadcast to everyone EXCEPT sender
      socket.to(roomCode).emit('whiteboard-update', { elements });
    });

    // ─── WHITEBOARD SYNC REQUEST ────────────────────────────────────────────
    socket.on('whiteboard-sync-request', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      // Send current whiteboard state to the requesting user
      if (room.whiteboardElements && room.whiteboardElements.length > 0) {
        socket.emit('whiteboard-update', room.whiteboardElements);
      }
    });

    // ─── DISCONNECT ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      if (!currentRoom || !currentUser) return;
      const room = currentRoom;

      room.participants = room.participants.filter(p => p.socketId !== socket.id);
      io.to(room.code).emit('room-update', { participants: room.participants });

      const leaveMsg = {
        sender: 'System',
        senderType: 'system',
        content: `${currentUser.userName} left the workspace.`,
        timestamp: new Date().toISOString(),
      };
      logMessage(room, leaveMsg);
      io.to(room.code).emit('system-message', leaveMsg);

      // Instead of immediately deleting, give a 5-min TTL for rejoin
      if (room.participants.length === 0) {
        scheduleEmptyTimer(room);
      }
    });
  });

  // Export rooms map for REST API use
  io.rooms$ = rooms;
}

export function getRoomParticipantCount(role) {
  let count = 0;
  for (const [, room] of rooms) {
    if (room.role === role && room.teamType === 'mix-humans') {
      const humans = room.participants.filter(p => p.isHuman);
      count += humans.length;
    }
  }
  return count;
}
