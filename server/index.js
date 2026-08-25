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

// Support comma-separated CLIENT_URL for multiple allowed origins (e.g. Vercel previews)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
};

const io = new Server(httpServer, { cors: corsOptions });

// Middleware
app.use(cors(corsOptions));
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
