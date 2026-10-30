import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiSave, FiSettings } from "react-icons/fi";

const STORAGE_KEY = "interviewagent.dashboardPeriod";
const choices = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "All time", value: 0 },
];
const readPeriod = () => {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  const value = saved === null ? 30 : Number(saved);
  return choices.some((choice) => choice.value === value) ? value : 30;
};

export default function Settings() {
  const [period, setPeriod] = useState(readPeriod);
  const [saved, setSaved] = useState(false);

  const save = (event) => {
    event.preventDefault();
    window.localStorage.setItem(STORAGE_KEY, String(period));
    setSaved(true);
  };

  return <main className="min-h-screen bg-[#f7f8fc] px-4 py-8 text-slate-800 sm:px-6 lg:px-9">
    <div className="mx-auto max-w-3xl">
      <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-700"><FiArrowLeft />Back to dashboard</Link>
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <header className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><FiSettings size={19} /></span>
          <div><h1 className="text-xl font-bold text-slate-900">Settings</h1><p className="mt-1 text-sm text-slate-500">Choose how your dashboard opens.</p></div>
        </header>
        <form onSubmit={save} className="space-y-5 p-6">
          <label className="block text-sm font-semibold text-slate-700">Default dashboard time period
            <select value={period} onChange={(event) => { setPeriod(Number(event.target.value)); setSaved(false); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 sm:max-w-sm">
              {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
            </select>
          </label>
          <p className="text-xs leading-5 text-slate-500">This preference is saved in this browser and used as the initial time range on your dashboard. You can still change the range from the dashboard itself.</p>
          <div className="flex items-center gap-4 border-t border-slate-100 pt-5">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800"><FiSave />Save settings</button>
            {saved && <span role="status" className="text-sm text-emerald-700">Settings saved.</span>}
          </div>
        </form>
      </section>
    </div>
  </main>;
}
