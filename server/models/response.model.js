import mongoose from "mongoose";

const responseSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  answer: { type: String, default: "" },
  score: { type: Number, min: 0, max: 10, default: 0 },
  confidence: { type: Number, min: 0, max: 10, default: 0 },
  communication: { type: Number, min: 0, max: 10, default: 0 },
  correctness: { type: Number, min: 0, max: 10, default: 0 },
  problemSolving: { type: Number, min: 0, max: 10, default: null },
  feedback: { type: String, default: "" },
  positiveFeedback: { type: String, default: "" },
}, { timestamps: true });

responseSchema.index({ questionId: 1, userId: 1 }, { unique: true });
export default mongoose.model("Response", responseSchema);
