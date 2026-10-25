import mongoose from "mongoose";

const gamificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  xp: { type: Number, default: 0, min: 0 },
  level: { type: Number, default: 1, min: 1 },
  currentStreak: { type: Number, default: 0, min: 0 },
  longestStreak: { type: Number, default: 0, min: 0 },
  lastActivityDate: { type: Date, default: null },
  completedInterviewIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Interview" }],
  badges: { type: [String], default: [] },
  leaderboardPoints: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

export default mongoose.model("Gamification", gamificationSchema, "gamification");
