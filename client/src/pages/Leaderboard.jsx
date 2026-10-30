import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { BsRobot } from "react-icons/bs";
import { FiActivity, FiAward, FiBarChart2, FiBookOpen, FiClock, FiGrid, FiPlay, FiSettings, FiShield, FiStar, FiTarget, FiTrendingUp, FiUser, FiUsers, FiZap } from "react-icons/fi";
import { ServerUrl } from "../App";

const number = (value) => new Intl.NumberFormat().format(value || 0);
const badgeIcons = { first: FiStar, consistency: FiActivity, quick: FiZap, problemSolver: FiTarget, top: FiAward, roles: FiBookOpen };

export default function Leaderboard() {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [period, setPeriod] = useState("week");
  const [role, setRole] = useState("All Roles");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () => axios.get(`${ServerUrl}/api/user/leaderboard`, { params: { period, role }, withCredentials: true })
      .then(({ data: result }) => { if (alive) { setData(result); setError(""); } })
      .catch((e) => { if (alive) setError(e.response?.data?.message || "Could not load the leaderboard."); })
      .finally(() => { if (alive) setLoading(false); });
    load();
    const timer = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener("focus", load); };
  }, [period, role]);

  const me = data?.currentUser;
  const podium = useMemo(() => data?.ranking?.slice(0, 3) || [], [data]);
  const progress = me?.levelProgress;
  const progressPercent = progress ? Math.min(100, Math.max(0, (progress.progressXP / Math.max(1, progress.nextLevelXP - progress.startXP)) * 100)) : 0;
  const nav = [["Start Interview", "/interview", FiPlay], ["History", "/history", FiClock], ["Dashboard", "/dashboard", FiGrid]];
  const selectStyle = "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

  return <div className="min-h-screen bg-[#f7f8fc] text-slate-800 lg:flex">
    <aside className="w-full border-b border-slate-200 bg-white px-4 py-4 lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
      <Link to="/" className="mb-5 flex items-center gap-3 px-2 lg:mb-10"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><BsRobot size={22} /></span><span><span className="block text-base font-bold text-slate-900">InterviewAgent</span><span className="block text-[11px] text-slate-500">Practice • Improve • Get Hired</span></span></Link>
      <nav className="flex gap-2 overflow-x-auto lg:flex-col">{nav.map(([label, to, Icon]) => <Link key={to} to={to} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"><Icon size={18} />{label}</Link>)}<div className="my-1 hidden border-t border-slate-100 lg:block" /><Link to="/leaderboard" className="flex shrink-0 items-center gap-3 rounded-xl bg-violet-100 px-3 py-3 text-sm font-semibold text-violet-800"><FiAward size={18} />Leaderboard</Link><Link to="/settings" className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><FiSettings size={18} />Settings</Link></nav>
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4 lg:mt-auto"><Avatar name={userData?.name} large /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{userData?.name || "Your profile"}</span><span className="block truncate text-xs text-slate-500">{userData?.email || "Interview practice"}</span></span></div>
    </aside>

    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:ml-64 lg:px-9 lg:py-9"><div className="mx-auto max-w-[1450px]">
      <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-700"><FiUsers />Community progress</p><h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Leaderboard</h1><p className="mt-2 text-sm text-slate-500 sm:text-base">Challenge yourself, stay consistent and improve your interview skills.</p></div><div className="flex flex-wrap gap-3"><label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">Time range<select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectStyle}><option value="week">This Week</option><option value="month">This Month</option><option value="all">All Time</option></select></label><label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">Role<select value={role} onChange={(e) => setRole(e.target.value)} className={selectStyle}><option>All Roles</option>{(data?.roles || []).map((item) => <option key={item}>{item}</option>)}</select></label></div></header>
      {error && <div role="alert" className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {loading && !data ? <div className="rounded-3xl bg-white p-12 text-center text-slate-500 shadow-sm">Loading leaderboard…</div> : data && <>
        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Current Level" value={`Level ${me?.level || 1}`} detail={`Rank #${data.currentRank || "—"}`} icon={FiShield} tone="violet" />
          <SummaryCard label="Total XP" value={`${number(me?.totalXP)} XP`} detail={`${number(me?.xp)} XP in this period`} icon={FiZap} tone="blue" />
          <SummaryCard label="Current Streak" value={`${me?.currentStreak || 0} ${me?.currentStreak === 1 ? "Day" : "Days"}`} detail="Interview activity streak" icon={FiActivity} tone="green" />
          <SummaryCard label="Interviews Completed" value={number(me?.allTimeInterviewsCompleted)} detail="Across all roles and time" icon={FiBarChart2} tone="pink" />
          <SummaryCard label="Badges Earned" value={`${me?.badgesEarned || 0} / 6`} detail="Achievements unlocked" icon={FiAward} tone="amber" />
        </section>

        <section className="mb-6 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Top learners</h2><p className="mt-1 text-sm text-slate-500">Ranked by XP earned {period === "all" ? "all time" : period === "week" ? "this week" : "this month"}.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm">{role}</span></div>
          {podium.length ? <div className="mx-auto grid max-w-3xl grid-cols-3 items-end gap-2 sm:gap-5">{[podium[1], podium[0], podium[2]].map((person, index) => person ? <Podium key={person.userId} person={person} position={[2, 1, 3][index]} isMe={person.userId === me?.userId} /> : <div key={`empty-${index}`} />)}</div> : <Empty text="Complete an interview to appear on the leaderboard." />}
        </section>

        <section className="mb-6 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <Panel title="Leaderboard" subtitle="XP rewards practice, consistency, improvement and achievements" icon={FiUsers}>
            <div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Rank</th><th className="px-3 py-3">Learner</th><th className="px-3 py-3">XP</th><th className="px-3 py-3">Level</th><th className="px-3 py-3">Streak</th><th className="px-3 py-3">Interviews</th><th className="px-3 py-3">Avg. Score</th></tr></thead><tbody>{data.ranking.map((person, index) => { const isMe = person.userId === me?.userId; return <tr key={person.userId} className={`border-b border-slate-50 last:border-0 ${isMe ? "bg-violet-50/80" : "hover:bg-slate-50/70"}`}><td className="px-3 py-3.5 font-semibold text-slate-500">#{index + 1}</td><td className="px-3 py-3.5"><div className="flex items-center gap-2.5"><Avatar name={person.name} /><span className="font-semibold text-slate-800">{person.name}{isMe && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">You</span>}</span></div></td><td className="px-3 py-3.5 font-bold text-violet-700">{number(person.xp)}</td><td className="px-3 py-3.5">Level {person.level}</td><td className="px-3 py-3.5">{person.currentStreak} days</td><td className="px-3 py-3.5">{person.interviewsCompleted}</td><td className="px-3 py-3.5">{person.averageScore == null ? "—" : `${person.averageScore}%`}</td></tr>; })}</tbody></table></div>
          </Panel>
          <Panel title="How XP works" subtitle="Earn points from different kinds of progress" icon={FiZap}><div className="space-y-3"><Rule icon={FiPlay} text="Complete an interview" xp="+100 XP" /><Rule icon={FiActivity} text="Continue a day-to-day streak" xp="+20 XP" /><Rule icon={FiTrendingUp} text="Score 8.5 or higher (Top Performer)" xp="+70 XP once" /><Rule icon={FiAward} text="Unlock another achievement" xp="Bonus XP" /><div className="mt-5 rounded-2xl bg-violet-50 p-4"><div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-slate-800">Level {me?.level || 1} progress</span><span className="text-xs font-medium text-violet-700">{number(me?.totalXP)} / {number(progress?.nextLevelXP)} XP</span></div><div className="h-2.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400" style={{ width: `${progressPercent}%` }} /></div><p className="mt-2 text-xs text-slate-500">Next Level: Level {(me?.level || 1) + 1}</p></div></div></Panel>
        </section>

        <section className="mb-6"><Panel title="Badges" subtitle="Achievement XP is included in your total" icon={FiAward}><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(me?.badges || []).map((badge) => { const Icon = badgeIcons[badge.id] || FiAward; return <div key={badge.id} className={`flex items-center gap-3 rounded-2xl border p-4 ${badge.earned ? "border-violet-100 bg-violet-50/70" : "border-slate-100 bg-slate-50/70 opacity-60"}`}><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${badge.earned ? "bg-white text-violet-700" : "bg-white text-slate-400"}`}><Icon size={20} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{badge.name}</span><span className="mt-1 block text-xs text-slate-500">{badge.earned ? `Earned · +${badge.xp} XP` : `Locked · +${badge.xp} XP`}</span></span>{badge.earned && <FiAward className="shrink-0 text-violet-600" />}</div>; })}</div></Panel></section>

        <section className="mb-4 rounded-3xl bg-gradient-to-r from-violet-700 to-indigo-600 p-6 text-white shadow-md shadow-violet-200 sm:flex sm:items-center sm:justify-between sm:px-8"><div className="max-w-xl"><p className="text-sm font-medium text-violet-100">Keep your momentum going</p><h2 className="mt-1 text-2xl font-bold">{me?.levelProgress?.xpToNext ? `You're only ${number(me.levelProgress.xpToNext)} XP away from Level ${(me.level || 1) + 1}!` : "Start earning XP toward your next level!"}</h2><div className="mt-4 h-2 max-w-md overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white" style={{ width: `${progressPercent}%` }} /></div></div><button onClick={() => navigate("/interview")} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50 sm:mt-0"><FiPlay />Start New Interview</button></section>
      </>}
    </div></main>
  </div>;
}

function Avatar({ name, large = false }) { return <span className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-blue-100 font-bold text-violet-800 ${large ? "h-10 w-10" : "h-9 w-9 text-xs"}`}>{name?.trim()?.slice(0, 1)?.toUpperCase() || <FiUser />}</span>; }
function SummaryCard({ label, value, detail, icon: Icon, tone }) { const tones = { violet: "bg-violet-100 text-violet-700", blue: "bg-blue-100 text-blue-700", green: "bg-emerald-100 text-emerald-700", pink: "bg-pink-100 text-pink-700", amber: "bg-amber-100 text-amber-700" }; return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200/40"><div className="mb-4 flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={17} /></span></div><p className="text-xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 min-h-4 text-[11px] text-slate-500">{detail}</p></div>; }
function Panel({ title, subtitle, icon: Icon, children }) { return <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Icon size={17} /></span><div><h2 className="font-semibold text-slate-900">{title}</h2>{subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}</div></div>{children}</div>; }
function Rule({ icon: Icon, text, xp }) { return <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-violet-700"><Icon size={16} /></span><span className="flex-1 text-sm text-slate-600">{text}</span><b className="whitespace-nowrap text-xs text-violet-700">{xp}</b></div>; }
function Podium({ person, position, isMe }) { const first = position === 1; const colors = first ? "border-amber-200 bg-amber-50/80" : position === 2 ? "border-slate-200 bg-white/90" : "border-orange-100 bg-orange-50/60"; return <div className={`rounded-2xl border p-3 text-center shadow-sm sm:p-5 ${first ? "mb-0 sm:-translate-y-3" : "mt-5"} ${colors}`}><span className={`mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full border-2 bg-white text-lg font-bold ${first ? "border-amber-300 text-amber-600" : position === 2 ? "border-slate-300 text-slate-500" : "border-orange-200 text-orange-600"}`}>{person.name?.slice(0, 1)?.toUpperCase()}</span><p className="truncate text-sm font-bold text-slate-900">{person.name}{isMe ? " · You" : ""}</p><p className="mt-1 text-xs font-semibold text-violet-700">{number(person.xp)} XP</p><p className="mt-1 text-[11px] text-slate-500">Level {person.level}</p><span className="mt-3 inline-block rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold text-slate-500">#{position}</span></div>; }
function Empty({ text }) { return <div className="rounded-2xl bg-white/70 px-5 py-10 text-center text-sm text-slate-500">{text}</div>; }
