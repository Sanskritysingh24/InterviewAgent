import Interview from "../models/interview.model.js";
import User from "../models/user.model.js";
import Gamification from "../models/gamification.model.js";
import Leaderboard from "../models/leaderboard.model.js";
import { average, levelFor, summarizeUser, syncUserGamification } from "../services/gamification.service.js";

export const getLeaderboard = async (req, res) => {
  try {
    const now = new Date();
    const period = ["week", "month", "all"].includes(req.query.period) ? req.query.period : "week";
    const roleFilter = String(req.query.role || "All Roles");
    const allInterviews = await Interview.find({ status: "completed" })
      .select("userId role finalScore questions.problemSolving createdAt updatedAt completedAt")
      .lean();
    await syncUserGamification(req.userId, now);
    const userIds = new Set(allInterviews.map((item) => String(item.userId)));
    userIds.add(String(req.userId));
    const [gamificationRecords, leaderboardRecords] = await Promise.all([
      Gamification.find({ userId: { $in: [...userIds] } }).lean(),
      Leaderboard.find({ userId: { $in: [...userIds] } }).lean(),
    ]);
    const gamificationByUser = new Map(gamificationRecords.map((item) => [String(item.userId), item]));
    const leaderboardByUser = new Map(leaderboardRecords.map((item) => [String(item.userId), item]));
    const users = await User.find({ _id: { $in: [...userIds] } }).select("name email").lean();
    const userById = new Map(users.map((user) => [String(user._id), user]));
    const roles = [...new Set(allInterviews.map((item) => item.role).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    let startDate = null;
    if (period === "week") {
      startDate = new Date(now);
      startDate.setUTCHours(0, 0, 0, 0);
      startDate.setUTCDate(startDate.getUTCDate() - ((startDate.getUTCDay() + 6) % 7));
    } else if (period === "month") {
      startDate = new Date(now);
      startDate.setUTCHours(0, 0, 0, 0);
      startDate.setUTCDate(1);
    }

    const ranking = [...userIds].map((userId) => {
      const account = userById.get(userId);
      const summary = summarizeUser(allInterviews.filter((item) => String(item.userId) === userId), now);
      const selectedEvents = summary.events.filter((event) =>
        (roleFilter === "All Roles" || event.role === roleFilter) && (!startDate || event.date >= startDate)
      );
      const selectedInterviews = selectedEvents.map((event) => event.interview);
      const persistedGamification = gamificationByUser.get(userId);
      const persistedLeaderboard = leaderboardByUser.get(userId);
      const selectedXP = roleFilter === "All Roles" && persistedLeaderboard
        ? (period === "all" ? persistedLeaderboard.totalXP : period === "month" ? persistedLeaderboard.monthlyXP : persistedLeaderboard.weeklyXP)
        : selectedEvents.reduce((total, event) => total + event.xp, 0);
      const totalXP = persistedLeaderboard?.totalXP ?? persistedGamification?.xp ?? summary.totalXP;
      const level = levelFor(totalXP);
      return {
        userId,
        name: account?.name || "Interview learner",
        xp: selectedXP,
        totalXP,
        level: persistedGamification?.level ?? level.level,
        currentStreak: persistedGamification?.currentStreak ?? summary.currentStreak,
        longestStreak: persistedGamification?.longestStreak ?? summary.longestStreak,
        interviewsCompleted: selectedInterviews.length,
        allTimeInterviewsCompleted: summary.interviews.length,
        averageScore: average(selectedInterviews.map((item) => item.finalScore)) == null ? null : Math.round(average(selectedInterviews.map((item) => item.finalScore)) * 10),
        badgesEarned: persistedGamification?.badges?.length ?? summary.badges.filter((badge) => badge.earned).length,
        badges: summary.badges,
        levelProgress: level,
      };
    }).filter((user) => user.userId === String(req.userId) || user.interviewsCompleted > 0)
      .sort((a, b) => b.xp - a.xp || (b.averageScore || 0) - (a.averageScore || 0) || a.name.localeCompare(b.name));

    const currentUser = ranking.find((user) => user.userId === String(req.userId));
    const currentRank = ranking.findIndex((user) => user.userId === String(req.userId)) + 1;
    return res.json({ period, role: roleFilter, roles, currentRank, currentUser, ranking });
  } catch (error) {
    console.error("Failed to build leaderboard:", error);
    return res.status(500).json({ message: "Could not load the leaderboard." });
  }
};
