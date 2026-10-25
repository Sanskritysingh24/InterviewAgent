
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  desiredRole: { type: String, trim: true, maxlength: 100, default: "" },
  linkedinUrl: { type: String, trim: true, maxlength: 250, default: "" },
  phone: { type: String, trim: true, maxlength: 30, default: "" },
  location: { type: String, trim: true, maxlength: 100, default: "" },
  portfolioUrl: { type: String, trim: true, maxlength: 250, default: "" },
  bio: { type: String, trim: true, maxlength: 500, default: "" },
  googleId: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },

}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;
