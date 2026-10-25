import express from "express"
import { getCurrentUser, updateProfile } from "../controllers/user.controller.js"
import isAuth from "../middlewares/isAuth.js"
import { getLeaderboard } from "../controllers/leaderboard.controller.js"


const userRouter = express.Router()

userRouter.get("/current-user",getCurrentUser)
userRouter.put("/profile", isAuth, updateProfile)
userRouter.get("/leaderboard", isAuth, getLeaderboard)

export default userRouter
