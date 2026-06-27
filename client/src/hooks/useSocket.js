import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSimStore } from '../store/useSimStore.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useSocket() {
  const socketRef = useRef(null);
  const {
    role,
    user,
    guestId,
    roomCode,
    setRoomCode,
    setRoomParticipants,
    setTeamComposition,
    setAvailableHumans,
    addMessage,
    setAiTyping,
    setEmergencyActive,
    messages,
  } = useSimStore();

  useEffect(() => {
    if (!role) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      // Socket.io will auto-reconnect; we handle rejoin manually on each connect
    });
    socketRef.current = socket;

    const userId = user?.id || guestId;
    const userName = user?.name || `Guest_${guestId.slice(-4)}`;

    socket.on('connect', () => {
      // If we have a saved roomCode in the store, attempt to rejoin that room.
      // Otherwise do a fresh join.
      const savedRoomCode = useSimStore.getState().roomCode;
      const teamComposition = useSimStore.getState().teamComposition;
      if (savedRoomCode) {
        socket.emit('rejoin-room', { roomCode: savedRoomCode, userId, userName });
      } else {
        socket.emit('join-room', { role, userId, userName, teamType: teamComposition });
      }
    });

    socket.on('room-joined', ({ roomCode: rc, participants, isEmergencyActive, replayMessages }) => {
      setRoomCode(rc);
      setRoomParticipants(participants);

      // Restore emergency banner if it was active
      if (isEmergencyActive) setEmergencyActive(true);

      // Replay messages from server (only on rejoin — avoids duplicates on fresh join)
      if (replayMessages && replayMessages.length > 0) {
        const currentIds = new Set(useSimStore.getState().messages.map(m => m.timestamp + m.content));
        replayMessages.forEach(msg => {
          const key = msg.timestamp + msg.content;
          if (!currentIds.has(key)) {
            if (msg.senderType === 'system') {
              addMessage({ sender: 'System', senderType: 'system', content: msg.content, timestamp: msg.timestamp });
            } else {
              addMessage(msg);
            }
          }
        });
      }
    });

    // Server signals the saved room is gone — fall back to fresh join
    socket.on('rejoin-failed', ({ reason }) => {
      console.warn('[socket] Rejoin failed:', reason);
      // Clear stale roomCode and join fresh
      setRoomCode(null);
      socket.emit('join-room', { role, userId, userName });
    });

    socket.on('room-update', ({ participants }) => {
      setRoomParticipants(participants);
    });

    socket.on('new-message', (msg) => {
      addMessage(msg);
    });

    socket.on('system-message', ({ content, timestamp }) => {
      addMessage({ sender: 'System', senderType: 'system', content, timestamp });
    });

    socket.on('ai-typing', ({ typing, channel }) => {
      // Store the channel string when typing, false when idle
      setAiTyping(typing ? (channel || 'team') : false);
    });

    socket.on('emergency-trigger', ({ label }) => {
      setEmergencyActive(true);
      addMessage({
        sender: 'System',
        senderType: 'system',
        content: `[ALERT] EMERGENCY: ${label}`,
        timestamp: new Date().toISOString(),
        isEmergency: true,
      });
    });

    socket.on('team-composition-update', ({ preference }) => {
      setTeamComposition(preference);
    });

    socket.on('available-humans', ({ rooms }) => {
      setAvailableHumans(rooms);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role]);

  const sendMessage = (content, channel = 'team') => {
    const userName = user?.name || `Guest_${guestId.slice(-4)}`;
    socketRef.current?.emit('user-message', { content, userName, channel });
  };

  const triggerEmergency = () => {
    socketRef.current?.emit('emergency-trigger');
  };

  const getAvailableHumans = () => {
    socketRef.current?.emit('get-available-humans', { role });
  };

  const setTeamCompositionPreference = (teamType) => {
    socketRef.current?.emit('set-team-composition', { teamType, preferredRoom: null });
  };

  return { sendMessage, triggerEmergency, getAvailableHumans, setTeamCompositionPreference, socket: socketRef };
}
