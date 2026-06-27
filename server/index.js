import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import { initRoomManager } from './socket/roomManager.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// Connect to MongoDB
connectDB();

// REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/room', roomRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Socket.io
initRoomManager(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 WorkPod server running on port ${PORT}`);
});
