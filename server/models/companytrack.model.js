import mongoose from "mongoose"

const companyTrackSchema = new mongoose.Schema({
  company: { type: String, required: true, unique: true },
  focusAreas: [String],
}, { timestamps: true })

export default mongoose.model("CompanyTrack", companyTrackSchema)