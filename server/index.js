import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/connectDb.js"
import cookieParser from "cookie-parser"
dotenv.config()
import cors from "cors"
import authRouter from "./routes/auth.route.js"
import userRouter from "./routes/user.route.js"
import interviewRouter from "./routes/interview.route.js"

import "./models/role.model.js"
import "./models/resume.model.js"
import "./models/question.model.js"
import "./models/response.model.js"
import "./models/aiCoaching.model.js"
import "./models/gamification.model.js"
import "./models/leaderboard.model.js"

const app = express()
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://interviewagent-major.netlify.app"
  ],
  credentials: true
}));

app.use(express.json())
app.use(cookieParser())

app.use("/api/auth" , authRouter)
app.use("/api/user", userRouter)
app.use("/api/interview" , interviewRouter)


const PORT = process.env.PORT || 6000
app.listen(PORT , ()=>{
    console.log(`Server running on port ${PORT}`)
    connectDb()
})
