import mongoose from "mongoose";

const responseSchema = new mongoose.Schema({
  interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  answer: { type: String, default: "" },
  userAnswer: { type: String, default: "" },
  category: { type: String, enum: ["Concepts", "Attitude", "Vocabulary", "Style", "Technical", "HR", "Behavioral", "theory", "coding", "practical", "scenario"], default: "Concepts" },
  score: { type: Number, min: 0, max: 100, default: 0 },
  verdict: { type: String, enum: ["good", "average", "poor"], default: null },
  feedback: { type: String, default: "" },
  correctAnswer: { type: String, default: "" },
  strengths: { type: [String], default: [] },
  improvements: { type: [String], default: [] },
  confidence: { type: Number, min: 0, max: 10, default: 0 },
  communication: { type: Number, min: 0, max: 10, default: 0 },
  correctness: { type: Number, min: 0, max: 10, default: 0 },
  problemSolving: { type: Number, min: 0, max: 10, default: null },
  positiveFeedback: { type: String, default: "" },
}, { timestamps: true });

responseSchema.index({ questionId: 1, userId: 1 }, { unique: true });
export default mongoose.model("Response", responseSchema);
