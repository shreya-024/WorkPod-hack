import Session from '../models/Session.js';
import User from '../models/User.js';

/**
 * GET /api/leaderboard
 *
 * Query params:
 *   role   (optional) – filter by role e.g. 'sde', 'hr', 'pm', 'ml_intern', 'sde_intern'
 *   limit  (optional) – max entries, default 20, max 100
 *
 * Returns the top users ranked by average overallScore across all their sessions.
 * Each entry includes: userId, name, avgScore, bestScore, sessionCount, lastPlayed.
 */
export const getLeaderboard = async (req, res) => {
  try {
    const { role, limit: rawLimit } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 100);

    // Build match stage — only sessions with a real userId and a score
    const match = {
      userId: { $ne: null },
      'score.overallScore': { $exists: true, $gt: 0 },
    };
    if (role && ['sde', 'hr', 'pm', 'ml_intern', 'sde_intern'].includes(role)) {
      match.role = role;
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$userId',
          avgScore: { $avg: '$score.overallScore' },
          bestScore: { $max: '$score.overallScore' },
          avgCommunication: { $avg: '$score.communication' },
          avgTaskManagement: { $avg: '$score.taskManagement' },
          avgPressureHandling: { $avg: '$score.pressureHandling' },
          sessionCount: { $sum: 1 },
          lastPlayed: { $max: '$createdAt' },
          roles: { $addToSet: '$role' },
        },
      },
      { $sort: { avgScore: -1 } },
      { $limit: limit },
      // Populate user name and email
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: { $ifNull: ['$user.name', 'Anonymous'] },
          avgScore: { $round: ['$avgScore', 1] },
          bestScore: 1,
          avgCommunication: { $round: ['$avgCommunication', 1] },
          avgTaskManagement: { $round: ['$avgTaskManagement', 1] },
          avgPressureHandling: { $round: ['$avgPressureHandling', 1] },
          sessionCount: 1,
          lastPlayed: 1,
          roles: 1,
        },
      },
    ];

    const leaderboard = await Session.aggregate(pipeline);

    res.json({
      leaderboard,
      total: leaderboard.length,
      filter: role || 'all',
    });
  } catch (err) {
    console.error('getLeaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/leaderboard/me/:userId
 *
 * Returns the requesting user's rank and stats relative to the leaderboard.
 */
export const getMyRank = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.query;

    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const match = {
      userId: { $ne: null },
      'score.overallScore': { $exists: true, $gt: 0 },
    };
    if (role && ['sde', 'hr', 'pm', 'ml_intern', 'sde_intern'].includes(role)) {
      match.role = role;
    }

    // Get all users' average scores to compute rank
    const allUsers = await Session.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$userId',
          avgScore: { $avg: '$score.overallScore' },
          sessionCount: { $sum: 1 },
        },
      },
      { $sort: { avgScore: -1 } },
    ]);

    const rank = allUsers.findIndex(u => u._id.toString() === userId) + 1;
    const myStats = allUsers.find(u => u._id.toString() === userId);

    if (!myStats) {
      return res.json({ rank: null, message: 'No sessions found for this user' });
    }

    res.json({
      rank,
      totalUsers: allUsers.length,
      avgScore: Math.round(myStats.avgScore * 10) / 10,
      sessionCount: myStats.sessionCount,
      percentile: Math.round(((allUsers.length - rank) / allUsers.length) * 100),
    });
  } catch (err) {
    console.error('getMyRank error:', err);
    res.status(500).json({ error: err.message });
  }
};
