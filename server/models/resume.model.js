import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  fileName: { type: String, default: "Resume.pdf" },
  role: { type: String, default: "" },
  experience: { type: String, default: "" },
  skills: { type: [String], default: [] },
  technologies: { type: [String], default: [] },
  projects: { type: [String], default: [] },
  resumeText: { type: String, default: "" },
}, { timestamps: true });

resumeSchema.index({ userId:  1, createdAt: -1 });

export default mongoose.model("Resume", resumeSchema);
