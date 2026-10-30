import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { BsRobot } from "react-icons/bs";
import { FiActivity, FiArrowDownRight, FiArrowUpRight, FiAward, FiBarChart2, FiBriefcase, FiClock, FiGrid, FiPlay, FiSettings, FiTarget, FiTrendingUp, FiUser, FiUsers } from "react-icons/fi";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ServerUrl } from "../App";

const periods = [{ label: "Last 7 Days", days: 7 }, { label: "Last 30 Days", days: 30 }, { label: "Last 90 Days", days: 90 }, { label: "All Time", days: 0 }];
const pct = (value) => value == null ? null : Math.round(value * 10);
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const dateLabel = (date) => new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function Dashboard() {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [persistedGamification, setPersistedGamification] = useState(null);
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [period, setPeriod] = useState(() => {
    const saved = window.localStorage.getItem("interviewagent.dashboardPeriod");
    return saved === null ? 30 : Number(saved);
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const loadDashboard = () => axios.get(`${ServerUrl}/api/interview/dashboard-data`, { withCredentials: true })
      .then(({ data }) => {
        if (alive) {
          setInterviews(Array.isArray(data) ? data : data.interviews || []);
          setPersistedGamification(Array.isArray(data) ? null : data.gamification || null);
          setError("");
        }
      })
      .catch((e) => { if (alive) setError(e.response?.data?.message || "Could not load interview data."); })
      .finally(() => { if (alive) setLoading(false); });
    loadDashboard();
    const refreshTimer = window.setInterval(loadDashboard, 30000);
    window.addEventListener("focus", loadDashboard);
    return () => {
      alive = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", loadDashboard);
    };
  }, []);

  const roles = useMemo(() => [...new Set(interviews.map((i) => i.role).filter(Boolean))].sort(), [interviews]);
  const filtered = useMemo(() => {
    const cutoff = period ? Date.now() - period * 86400000 : 0;
    return interviews.filter((i) => (roleFilter === "All Roles" || i.role === roleFilter) && (!cutoff || new Date(i.createdAt).getTime() >= cutoff));
  }, [interviews, roleFilter, period]);

  const data = useMemo(() => {
    const newest = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const chronological = [...newest].reverse();
    const latest = newest[0];
    const previous = newest[1];
    const highest = filtered.reduce((top, item) => !top || item.scores.overall > top.scores.overall ? item : top, null);
    const overall = mean(filtered.map((i) => i.scores.overall).filter(Number.isFinite));
    const trend = chronological.map((i, index) => ({ name: `#${index + 1}`, date: dateLabel(i.createdAt), role: i.role, score: pct(i.scores.overall) }));
    const roleGroups = new Map();
    filtered.forEach((i) => { if (!roleGroups.has(i.role)) roleGroups.set(i.role, []); roleGroups.get(i.role).push(i); });
    const byRole = [...roleGroups].map(([name, items]) => ({
      role: name.length > 18 ? `${name.slice(0, 16)}…` : name,
      technical: pct(mean(items.map((i) => i.scores.technical).filter(Number.isFinite))),
      communication: pct(mean(items.map((i) => i.scores.communication).filter(Number.isFinite))),
      problemSolving: pct(mean(items.map((i) => i.scores.problemSolving).filter(Number.isFinite))),
      overall: pct(mean(items.map((i) => i.scores.overall).filter(Number.isFinite))),
    }));
    const metricAreas = [
      { name: "Technical Knowledge", values: filtered.map((i) => i.scores.technical).filter(Number.isFinite) },
      { name: "Communication", values: filtered.map((i) => i.scores.communication).filter(Number.isFinite) },
      { name: "Problem Solving", values: filtered.map((i) => i.scores.problemSolving).filter(Number.isFinite) },
      { name: "Confidence", values: filtered.map((i) => i.scores.confidence).filter(Number.isFinite) },
    ].filter((i) => i.values.length).map((i) => ({ name: i.name, value: pct(mean(i.values)), sampleSize: i.values.length }));
    const skillGroups = new Map();
    filtered.forEach((i) => (i.skillScores || []).forEach((skill) => {
      if (!skillGroups.has(skill.name)) skillGroups.set(skill.name, []);
      skillGroups.get(skill.name).push(pct(skill.score));
    }));
    const areas = [...metricAreas, ...[...skillGroups].map(([name, values]) => ({ name, value: Math.round(mean(values)), sampleSize: values.length }))].sort((a, b) => b.value - a.value);
    let strong;
    if (roleFilter === "All Roles") {
      // Keep role-specific strengths visible when lower scores in other roles reduce the overall average.
      const byRoleArea = new Map();
      filtered.forEach((interview) => {
        const roleAreas = [
          ["Technical Knowledge", interview.scores.technical],
          ["Communication", interview.scores.communication],
          ["Problem Solving", interview.scores.problemSolving],
          ["Confidence", interview.scores.confidence],
          ...(interview.skillScores || []).map((skill) => [skill.name, skill.score]),
        ];
        roleAreas.forEach(([name, score]) => {
          if (!Number.isFinite(score)) return;
          const key = `${interview.role}::${name}`;
          if (!byRoleArea.has(key)) byRoleArea.set(key, { name: `${name} - ${interview.role}`, values: [] });
          byRoleArea.get(key).values.push(pct(score));
        });
      });
      strong = [...byRoleArea.values()]
        .map(({ name, values }) => ({ name, value: Math.round(mean(values)), sampleSize: values.length }))
        .filter((area) => area.value >= 75 && area.sampleSize >= 2)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    } else {
      strong = areas.filter((i) => i.value >= 75 && i.sampleSize >= 2).slice(0, 5);
    }
    const improve = [...areas].filter((i) => i.value < 70 && i.sampleSize >= 2).sort((a, b) => a.value - b.value).slice(0, 5);
    const insights = [];
    if (chronological.length > 1) {
      const change = pct(chronological.at(-1).scores.overall) - pct(chronological[0].scores.overall);
      insights.push(change > 0 ? `Your score improved by ${change} points across this period.` : change < 0 ? `Your latest score is ${Math.abs(change)} points below your first interview in this period.` : "Your overall score has stayed consistent across this period.");
    } else insights.push("Complete another interview to see how your performance is changing.");
    if (areas[0]) insights.push(`${areas[0].name} is your strongest measured area at ${areas[0].value}%.`);
    if (improve[0]) insights.push(`${improve[0].name} could use more practice at ${improve[0].value}%.`);
    const commValues = chronological.map((i) => i.scores.communication).filter(Number.isFinite);
    if (commValues.length > 1) {
      const recentComm = mean(commValues.slice(-Math.min(3, commValues.length)));
      const earlierComm = mean(commValues.slice(0, Math.max(1, commValues.length - 3)));
      if (recentComm - earlierComm > 0.3) insights.push("Your communication scores are trending upward.");
    }
    return { newest, chronological, latest, previous, highest, overall, trend, byRole, strong, improve, insights: insights.slice(0, 4), rolesAttempted: new Set(filtered.map((i) => i.role)).size, delta: latest && previous ? (latest.scores.overall - previous.scores.overall) * 10 : null };
  }, [filtered]);

  const nav = [
    ["Start Interview", "/interview", FiPlay], ["History", "/history", FiClock], ["Dashboard", "/dashboard", FiGrid],
  ];
  const selectStyle = "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

  return <div className="min-h-screen bg-[#f7f8fc] text-slate-800 lg:flex">
    <aside className="w-full border-b border-slate-200 bg-white px-4 py-4 lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
      <Link to="/" className="mb-5 flex items-center gap-3 px-2 lg:mb-10">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><BsRobot size={22} /></span>
        <span><span className="block text-base font-bold text-slate-900">InterviewAgent</span><span className="block text-[11px] text-slate-500">Practice • Improve • Get Hired</span></span>
      </Link>
      <nav className="flex gap-2 overflow-x-auto lg:flex-col">
        {nav.map(([label, to, Icon]) => <Link key={to} to={to} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${label === "Dashboard" ? "bg-violet-100 text-violet-800" : "text-slate-600 hover:bg-slate-50"}`}><Icon size={18} />{label}</Link>)}
        <div className="my-1 hidden border-t border-slate-100 lg:block" />
        <Link to="/leaderboard" className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><FiAward size={18} />Leaderboard</Link>
        <Link to="/settings" className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><FiSettings size={18} />Settings</Link>
      </nav>
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4 lg:mt-auto"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-blue-100 font-semibold text-violet-800">{userData?.name?.slice(0, 1)?.toUpperCase() || <FiUser />}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{userData?.name || "Your profile"}</span><span className="block truncate text-xs text-slate-500">{userData?.email || "Interview practice"}</span></span></div>
    </aside>

    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:ml-64 lg:px-9 lg:py-9"><div className="mx-auto max-w-[1500px]">
      <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-700"><FiActivity />Your progress at a glance</p><h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Dashboard</h1><p className="mt-2 text-sm text-slate-500 sm:text-base">Track your interview performance and improvement</p></div>
        <div className="flex flex-wrap gap-3"><label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">Role<select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectStyle}><option>All Roles</option>{roles.map((role) => <option key={role}>{role}</option>)}</select></label><label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">Time period<select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className={selectStyle}>{periods.map((p) => <option key={p.label} value={p.days}>{p.label}</option>)}</select></label></div>
      </header>
      {error && <div role="alert" className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {loading ? <div className="rounded-3xl bg-white p-12 text-center text-slate-500 shadow-sm">Loading your interview performance…</div> : filtered.length === 0 ? <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-sm"><span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><FiBarChart2 size={25} /></span><h2 className="text-lg font-semibold text-slate-900">No completed interviews in this period</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Start an interview to build your performance history. Scores and reports will appear here.</p><button onClick={() => navigate("/interview")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800"><FiPlay />Start Interview</button></div> : <>
        <section className="mb-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <Metric title="Overall Score" value={`${Math.round((data.overall || 0) * 10)}%`} detail={data.delta == null ? "Complete another interview to compare" : `${data.delta > 0 ? "+" : ""}${Math.round(data.delta)}% vs previous interview`} icon={FiTarget} tone="violet" />
          <Metric title="Total Interviews" value={filtered.length} detail={`${data.rolesAttempted} ${data.rolesAttempted === 1 ? "role" : "different roles"} attempted`} icon={FiBriefcase} tone="blue" />
          <Metric title="Highest Score" value={`${pct(data.highest?.scores.overall) ?? 0}%`} detail={data.highest?.role || "No role recorded"} icon={FiAward} tone="green" />
          <Metric title="Latest Interview" value={`${pct(data.latest?.scores.overall) ?? 0}%`} detail={`${data.latest?.role || "Interview"} · ${data.latest ? dateLabel(data.latest.createdAt) : ""}`} icon={FiTrendingUp} tone="pink" />
        </section>

        <section className="mb-6 grid gap-5 2xl:grid-cols-[1.55fr_1fr]">
          <Panel title="Performance Improvement" subtitle="Overall score across completed interviews" icon={FiTrendingUp}><div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.trend} margin={{ top: 8, right: 12, left: -16, bottom: 2 }}><CartesianGrid stroke="#eef0f6" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#8a91a5", fontSize: 12 }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "#8a91a5", fontSize: 12 }} tickFormatter={(v) => `${v}%`} /><Tooltip content={<TrendTip />} /><Line type="monotone" dataKey="score" name="Overall score" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4, fill: "#fff", stroke: "#7c3aed", strokeWidth: 2 }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div></Panel>
          <Panel title="Latest vs Previous" subtitle="Your two most recent interviews" icon={FiActivity}>{data.previous ? <div className="flex h-72 flex-col justify-center gap-5"><Compare label="Previous Interview" item={data.previous} tone="blue" /><Compare label="Latest Interview" item={data.latest} tone="violet" /><div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${data.delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}><span className="text-sm font-semibold">Improvement</span><span className="flex items-center gap-1 text-lg font-bold">{data.delta >= 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}{data.delta > 0 ? "+" : ""}{Math.round(data.delta)}%</span></div></div> : <Empty>Complete another interview to compare results.</Empty>}</Panel>
        </section>

        <section className="mb-6"><Panel title="Role-wise Performance" subtitle="Average scores by role" icon={FiUsers}><div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.byRole} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}><CartesianGrid stroke="#eef0f6" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="role" tickLine={false} axisLine={false} tick={{ fill: "#697187", fontSize: 12 }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "#8a91a5", fontSize: 12 }} tickFormatter={(v) => `${v}%`} /><Tooltip formatter={(v) => v == null ? "Not available" : `${v}%`} /><Legend /><Bar dataKey="technical" name="Technical" fill="#8b5cf6" radius={[5, 5, 0, 0]} /><Bar dataKey="communication" name="Communication" fill="#60a5fa" radius={[5, 5, 0, 0]} /><Bar dataKey="problemSolving" name="Problem Solving" fill="#34d399" radius={[5, 5, 0, 0]} /><Bar dataKey="overall" name="Overall" fill="#f0abfc" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>{data.byRole.some((r) => r.problemSolving == null) && <p className="mt-2 text-xs text-slate-400">Problem-solving scores are available for interviews evaluated after this metric was added.</p>}</Panel></section>

        <section className="mb-6 grid gap-5 xl:grid-cols-2"><AreaPanel title="Strong Areas" icon={FiAward} items={data.strong} empty="Your stronger areas will appear as you complete more scored interviews." strong /><AreaPanel title="Areas to Improve" icon={FiTarget} items={data.improve} empty="No consistently low areas in this selection. Keep practicing to build a clearer trend." /></section>

        <section className="mb-6 grid gap-5 xl:grid-cols-[1.45fr_1fr]"><Panel title="Detailed Interview Reports" subtitle="Open a report for question-level feedback" icon={FiBriefcase}><div className="overflow-x-auto"><table className="w-full min-w-[1020px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3">#</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Overall</th><th className="px-3 py-3">Technical</th><th className="px-3 py-3">Communication</th><th className="px-3 py-3">Problem Solving</th><th className="px-3 py-3">Confidence</th><th className="px-3 py-3">Report</th></tr></thead><tbody>{data.newest.map((item, index) => <tr key={item._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70"><td className="px-3 py-3.5 text-slate-400">{data.newest.length - index}</td><td className="px-3 py-3.5 font-medium text-slate-800">{item.role}</td><td className="px-3 py-3.5 text-slate-500">{dateLabel(item.createdAt)}</td><td className="px-3 py-3.5 font-semibold text-violet-700">{pct(item.scores.overall)}%</td><td className="px-3 py-3.5">{pct(item.scores.technical) == null ? "—" : `${pct(item.scores.technical)}%`}</td><td className="px-3 py-3.5">{pct(item.scores.communication) == null ? "—" : `${pct(item.scores.communication)}%`}</td><td className="px-3 py-3.5">{pct(item.scores.problemSolving) == null ? "—" : `${pct(item.scores.problemSolving)}%`}</td><td className="px-3 py-3.5">{pct(item.scores.confidence) == null ? "—" : `${pct(item.scores.confidence)}%`}</td><td className="px-3 py-3.5"><Link to={`/report/${item._id}?source=dashboard`} className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100">View Report</Link></td></tr>)}</tbody></table></div></Panel>
          <Panel title="Quick Insights" subtitle="Based on selected interview history" icon={FiActivity}><div className="space-y-3">{data.insights.map((item, index) => <div key={index} className="flex gap-3 rounded-xl bg-slate-50 p-3.5 text-sm leading-5 text-slate-600"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><FiTrendingUp size={14} /></span>{item}</div>)}</div></Panel>
        </section>
      </>}
    </div></main>
  </div>;
}

function Metric({ title, value, detail, icon: Icon, tone }) {
  const tones = { violet: "bg-violet-100 text-violet-700", blue: "bg-blue-100 text-blue-700", green: "bg-emerald-100 text-emerald-700", pink: "bg-pink-100 text-pink-700" };
  return <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/40"><div className="mb-5 flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{title}</span><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span></div><div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div><p className="mt-2 min-h-5 text-xs font-medium text-slate-500">{detail}</p></div>;
}
function Panel({ title, subtitle, icon: Icon, children }) {
  return <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Icon size={17} /></span><div><h2 className="font-semibold text-slate-900">{title}</h2>{subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}</div></div>{children}</div>;
}
function AreaPanel({ title, icon, items, empty, strong = false }) {
  const subtitle = strong ? "Strong scores are grouped by role when All Roles is selected" : "Metric averages use all answers; skills use matching question scores";
  return <Panel title={title} subtitle={subtitle} icon={icon}>{items.length ? <div className="space-y-4">{items.map((item) => <div key={item.name}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{item.name}</span><span className="flex items-center gap-2"><b className="text-slate-800">{item.value}%</b><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${strong ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{strong ? "Strong" : "Needs Improvement"}</span></span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${strong ? "bg-gradient-to-r from-violet-400 to-emerald-400" : "bg-gradient-to-r from-pink-300 to-amber-400"}`} style={{ width: `${item.value}%` }} /></div></div>)}</div> : <Empty>{empty}</Empty>}</Panel>;
}
function Compare({ label, item, tone }) {
  return <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div><p className="text-sm font-semibold text-slate-700">{label}</p><p className="mt-1 text-xs text-slate-500">{item.role}</p></div><span className={`text-2xl font-bold ${tone === "blue" ? "text-blue-600" : "text-violet-700"}`}>{pct(item.scores.overall)}%</span></div>;
}
function Empty({ children }) { return <div className="flex h-60 items-center justify-center rounded-xl bg-slate-50 px-6 text-center text-sm text-slate-500">{children}</div>; }
function TrendTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-lg"><p className="text-xs text-slate-500">{point.date} · {point.role}</p><p className="mt-1 text-sm font-semibold text-violet-700">Overall score: {point.score}%</p></div>;
}

