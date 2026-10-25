import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  role: { type: String, required: true, unique: true, trim: true },
  skills: { type: [String], default: [] },
  topics: { type: [String], default: [] },
}, { timestamps: true });

export default mongoose.model("Role", roleSchema);
