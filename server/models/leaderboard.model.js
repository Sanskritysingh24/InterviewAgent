import mongoose from "mongoose";

const leaderboardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  rank: { type: Number, default: 0, min: 0 },
  weeklyXP: { type: Number, default: 0, min: 0 },
  monthlyXP: { type: Number, default: 0, min: 0 },
  totalXP: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

leaderboardSchema.index({ totalXP: -1 });
export default mongoose.model("Leaderboard", leaderboardSchema, "leaderboard");
