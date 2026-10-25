import mongoose from "mongoose";

// Questions form a tree: main question -> follow-up -> follow-up
// The link is parentQuestionId (null for main questions).
const questionSchema = new mongoose.Schema({
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true },
    text: { type: String, required: true },
    type: { type: String, enum: ["main", "followUp"], default: "main" },
    parentQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", default: null },
    depth: { type: Number, default: 0 },          // 0 = main, 1 = first follow-up, 2 = second
    order: { type: Number, default: 0 },          // position among main questions
    category: { type: String, enum: ["theory", "coding", "practical", "scenario"], default: "theory" },
    difficulty: { type: String, default: "medium" },
    timeLimit: { type: Number, default: 90 },
}, { timestamps: true });

questionSchema.index({ interviewId: 1, order: 1 });

const Question = mongoose.model("Question", questionSchema);
export default Question;