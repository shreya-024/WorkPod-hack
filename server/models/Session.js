import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sender: String,       // 'user' | member name
  senderType: String,   // 'user' | 'ai' | 'system'
  content: String,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const RoadmapItemSchema = new mongoose.Schema({
  title: String,        // resource/skill name
  url: String,          // real URL
  reason: String,       // one line why this helps
}, { _id: false });

const ScoreSchema = new mongoose.Schema({
  overallScore: Number,
  communication: Number,
  taskManagement: Number,
  pressureHandling: Number,
  feedback: [String],
  roadmap: [RoadmapItemSchema],
}, { _id: false });

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  guestId: { type: String, default: null },
  role: { type: String, enum: ['sde', 'hr', 'pm', 'ml_intern', 'sde_intern'], required: true },
  roomId: { type: String, required: true },
  messages: [MessageSchema],
  tasksCompleted: [String],
  emergencyTriggered: { type: Boolean, default: false },
  durationSeconds: { type: Number, default: 0 },
  score: ScoreSchema,
  report: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Session', SessionSchema);
