import mongoose from "mongoose";

const aiCoachingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true, index: true },
  weakTopics: { type: [String], default: [] },
  flashcards: { type: [String], default: [] },
  practiceQuestions: { type: [String], default: [] },
}, { timestamps: true });

aiCoachingSchema.index({ userId: 1, interviewId: 1 }, { unique: true });
export default mongoose.model("AICoaching", aiCoachingSchema);
