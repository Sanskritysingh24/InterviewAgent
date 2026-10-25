import mongoose from "mongoose";

const questionsSchema = new mongoose.Schema({
  question: String,
  category: String,
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },

  // Follow-up tracking
  isFollowUp: { type: Boolean, default: false },
  depth: { type: Number, default: 0 },          // 0 = main, 1-2 = follow-up

  difficulty: String,
  timeLimit: Number,
  answer: String,
  feedback: String,                              // positive + improvement (UI ke liye)
  positiveFeedback: String,
  improvementFeedback: String,
  score: { type: Number, default: 0 },
  confidence: { type: Number, default: 0 },
  communication: { type: Number, default: 0 },
  correctness: { type: Number, default: 0 },     // = technical accuracy
  completeness: { type: Number, default: 0 },
  problemSolving: { type: Number, default: null },
})


const interviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  role: {
    type: String,
    required: true
  },
  experience: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    enum: ["HR", "Technical"],
    required: true
  },

  topic: String,
  difficulty: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    default: "Intermediate",
  },
  companyTrack: String,
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume" },

  resumeText: {
    type: String
  },

  // Conversation State Machine (backend control karta hai, LLM nahi)
  conversationState: {
    type: String,
    enum: ["ASKING_MAIN", "ASKING_FOLLOWUP", "EVALUATING", "COMPLETED"],
    default: "ASKING_MAIN",
  },
  currentQuestion: { type: Number, default: 0 },
  followUpDepth: { type: Number, default: 0 },
  maxFollowUps: { type: Number, default: 2 },
  maxTotalQuestions: { type: Number, default: 8 },   // main + follow-ups ki hard limit

  questions: [questionsSchema],

  finalScore: { type: Number, default: 0 },
  completedAt: { type: Date, default: null },

  status: {
    type: String,
    enum: ["Incompleted", "completed"],
    default: "Incompleted",
  }
}, { timestamps: true })

const Interview = mongoose.model("Interview", interviewSchema)


export default Interview
