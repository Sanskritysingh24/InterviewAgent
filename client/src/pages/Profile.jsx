import React, { useEffect, useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave, FiUser } from "react-icons/fi";
import Navbar from "../components/Navbar";
import { ServerUrl } from "../App";
import { setUserData } from "../redux/userSlice";

const fields = [
  { name: "desiredRole", label: "Role you’re targeting", placeholder: "Product Designer, Software Engineer…" },
  { name: "linkedinUrl", label: "LinkedIn profile", placeholder: "https://www.linkedin.com/in/your-name" },
  { name: "phone", label: "Phone number", placeholder: "+1 555 123 4567" },
  { name: "location", label: "Location", placeholder: "City, Country" },
  { name: "portfolioUrl", label: "Portfolio or personal website", placeholder: "https://your-portfolio.com" },
];

export default function Profile() {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", desiredRole: "", linkedinUrl: "", phone: "", location: "", portfolioUrl: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (userData) setForm((current) => ({ ...current, ...Object.fromEntries(Object.keys(current).map((key) => [key, userData[key] || ""])) }));
  }, [userData]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true); setMessage(""); setError("");
    try {
      const { data } = await axios.put(`${ServerUrl}/api/user/profile`, form, { withCredentials: true });
      dispatch(setUserData(data));
      navigate("/");
    } catch (e) {
      setError(e.response?.data?.message || "Could not save your profile.");
    } finally { setSaving(false); }
  };

  const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
  return <div className="min-h-screen bg-[#f3f3f3] pb-12">
    <Navbar />
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-700"><FiArrowLeft />Back to home</Link>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-violet-700 to-indigo-600 px-6 py-7 text-white sm:px-8">
          <div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><FiUser size={23} /></span><div><h1 className="text-2xl font-bold">Your profile</h1><p className="mt-1 text-sm text-violet-100">Add details that help personalize your interview practice.</p></div></div>
        </div>
        <form onSubmit={saveProfile} className="space-y-7 p-6 sm:p-8">
          <div>
            <h2 className="font-semibold text-slate-900">Basic information</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Full name<input name="name" required maxLength={100} value={form.name} onChange={updateField} placeholder="Your name" className={inputClass} /></label>
              <label className="text-sm font-medium text-slate-700">Email address<input value={userData?.email || ""} disabled className={`${inputClass} bg-slate-50 text-slate-500`} /></label>
              {fields.map(({ name, label, placeholder }) => <label key={name} className="text-sm font-medium text-slate-700">{label}<input name={name} value={form[name]} onChange={updateField} placeholder={placeholder} className={inputClass} /></label>)}
            </div>
          </div>
          <label className="block text-sm font-medium text-slate-700">About you<textarea name="bio" rows={4} maxLength={500} value={form.bio} onChange={updateField} placeholder="Share your experience, strengths, or what you’re working toward." className={inputClass} /><span className="mt-1 block text-right text-xs font-normal text-slate-400">{form.bio.length}/500</span></label>
          {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center"><p className="text-xs text-slate-500">Your email is managed by your sign-in account.</p><button disabled={saving || !userData} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:opacity-60"><FiSave />{saving ? "Saving…" : "Save profile"}</button></div>
        </form>
      </section>
    </main>
  </div>;
}
