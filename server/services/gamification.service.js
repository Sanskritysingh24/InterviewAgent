import Interview from "../models/interview.model.js";
import Gamification from "../models/gamification.model.js";
import Leaderboard from "../models/leaderboard.model.js";

const BADGES = [
  { id: "first", name: "First Interview", xp: 50 },
  { id: "consistency", name: "Consistency", xp: 75 },
  { id: "quick", name: "Quick Learner", xp: 60 },
  { id: "problemSolver", name: "Problem Solver", xp: 60 },
  { id: "top", name: "Top Performer", xp: 70 },
  { id: "roles", name: "Role Explorer", xp: 60 },
];
const LEVEL_STARTS = [0, 250, 600, 1000, 1500, 2200, 3000, 4000];
const dayKey = (date) => new Date(date).toISOString().slice(0, 10);
const dateFromDay = (key) => new Date(`${key}T00:00:00.000Z`);
export const average = (values) => values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;

export const levelFor = (xp) => {
  const thresholds = [...LEVEL_STARTS];
  while (xp >= thresholds.at(-1)) thresholds.push(thresholds.at(-1) + 1000);
  let level = 1;
  while (level < thresholds.length && xp >= thresholds[level]) level += 1;
  const start = thresholds[level - 1] || 0;
  const next = thresholds[level] || start + 1000;
  return { level, startXP: start, nextLevelXP: next, progressXP: xp - start, xpToNext: Math.max(0, next - xp) };
};

export function summarizeUser(interviews, now) {
  const sorted = interviews.map((interview) => ({
    ...interview,
    activityDate: interview.completedAt || interview.updatedAt || interview.createdAt,
    finalScore: Number(interview.finalScore) || 0,
  })).sort((a, b) => new Date(a.activityDate) - new Date(b.activityDate));
  const events = sorted.map((interview) => ({ date: new Date(interview.activityDate), role: interview.role, xp: 100, interview }));
  const badgeUnlocks = new Map();
  const unlock = (id, index) => {
    if (badgeUnlocks.has(id)) return;
    const badge = BADGES.find((item) => item.id === id);
    badgeUnlocks.set(id, { ...badge, interviewIndex: index });
    events[index].xp += badge.xp;
  };

  const seenRoles = new Set();
  sorted.forEach((interview, index) => {
    if (index === 0) unlock("first", index);
    if (index === 4) unlock("consistency", index);
    if (interview.finalScore >= 8.5) unlock("top", index);
    const problemScores = (interview.questions || []).filter((question) => question.problemSolving != null)
      .map((question) => Number(question.problemSolving)).filter(Number.isFinite);
    if (problemScores.length && average(problemScores) >= 8) unlock("problemSolver", index);
    if (index > 0 && interview.finalScore - sorted[index - 1].finalScore >= 1) unlock("quick", index);
    if (interview.role) {
      seenRoles.add(interview.role);
      if (seenRoles.size >= 3) unlock("roles", index);
    }
  });

  const byDay = new Map();
  events.forEach((event, index) => byDay.set(dayKey(event.date), index));
  const days = [...byDay.keys()].sort();
  for (let index = 1; index < days.length; index += 1) {
    const gap = dateFromDay(days[index]) - dateFromDay(days[index - 1]);
    if (gap === 86400000) events[byDay.get(days[index])].xp += 20;
  }

  let currentStreak = 0;
  let longestStreak = 0;
  for (let index = 0; index < days.length; index += 1) {
    if (index === 0 || dateFromDay(days[index]) - dateFromDay(days[index - 1]) !== 86400000) currentStreak = 1;
    else currentStreak += 1;
    longestStreak = Math.max(longestStreak, currentStreak);
  }
  currentStreak = 0;
  if (days.length) {
    const today = dayKey(now);
    const yesterdayDate = new Date(now);
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = dayKey(yesterdayDate);
    const latest = days.at(-1);
    if (latest === today || latest === yesterday) {
      currentStreak = 1;
      for (let index = days.length - 1; index > 0; index -= 1) {
        if (dateFromDay(days[index]) - dateFromDay(days[index - 1]) !== 86400000) break;
        currentStreak += 1;
      }
    }
  }
  const badges = BADGES.map((badge) => ({ ...badge, earned: badgeUnlocks.has(badge.id) }));
  return {
    interviews: sorted,
    events,
    badges,
    currentStreak,
    longestStreak,
    totalXP: events.reduce((sum, event) => sum + event.xp, 0),
    lastActivityDate: sorted.at(-1)?.activityDate || null,
  };
}

const periodXP = (events, startDate) => events
  .filter((event) => !startDate || event.date >= startDate)
  .reduce((sum, event) => sum + event.xp, 0);

export async function syncUserGamification(userId, now = new Date()) {
  const interviews = await Interview.find({ userId, status: "completed" })
    .select("role finalScore questions.problemSolving createdAt updatedAt completedAt")
    .lean();
  const summary = summarizeUser(interviews, now);
  const level = levelFor(summary.totalXP);
  const weekStart = new Date(now);
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const monthStart = new Date(now);
  monthStart.setUTCHours(0, 0, 0, 0);
  monthStart.setUTCDate(1);

  const gamification = {
    xp: summary.totalXP,
    level: level.level,
    currentStreak: summary.currentStreak,
    longestStreak: summary.longestStreak,
    lastActivityDate: summary.lastActivityDate,
    completedInterviewIds: summary.interviews.map((interview) => interview._id),
    badges: summary.badges.filter((badge) => badge.earned).map((badge) => badge.name),
    leaderboardPoints: summary.totalXP,
  };
  const leaderboard = {
    weeklyXP: periodXP(summary.events, weekStart),
    monthlyXP: periodXP(summary.events, monthStart),
    totalXP: summary.totalXP,
  };

  await Promise.all([
    Gamification.updateOne({ userId }, { $set: gamification, $setOnInsert: { userId } }, { upsert: true }),
    Leaderboard.updateOne({ userId }, { $set: leaderboard, $setOnInsert: { userId } }, { upsert: true }),
  ]);
  return { ...gamification, ...level, badges: summary.badges, interviewsCompleted: summary.interviews.length };
}
