import express from 'express';
import { getLeaderboard, getMyRank } from '../controllers/leaderboardController.js';

const router = express.Router();

// GET /api/leaderboard?role=sde&limit=20
router.get('/', getLeaderboard);

// GET /api/leaderboard/me/:userId?role=sde
router.get('/me/:userId', getMyRank);

export default router;
