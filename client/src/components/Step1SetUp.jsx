import React from 'react'
import { motion } from "motion/react"
import {
    FaUserTie,
    FaBriefcase,
    FaFileUpload,
    FaMicrophoneAlt,
    FaChartLine,
} from "react-icons/fa";
import { useEffect, useState } from 'react';
import axios from "axios"
import { ServerUrl } from '../App';
function Step1SetUp({ onStart }) {
    const [role, setRole] = useState("");
    const [experience, setExperience] = useState("");
    const [mode, setMode] = useState("Technical");
    const [interviewLevel, setInterviewLevel] = useState("medium");
    const [resumeFile, setResumeFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [startError, setStartError] = useState("");
    const [analysisDone, setAnalysisDone] = useState(false);
    const [savedResume, setSavedResume] = useState(null);
    const [resumeChoice, setResumeChoice] = useState("none");
    const [selectedResumeId, setSelectedResumeId] = useState("");

    useEffect(() => {
        axios.get(ServerUrl + "/api/interview/resume/latest", { withCredentials: true })
            .then((result) => setSavedResume(result.data))
            .catch(() => setSavedResume(null));
    }, []);
    const [analyzing, setAnalyzing] = useState(false);
    const [resumeError, setResumeError] = useState("");


    const handleUploadResume = async () => {
        if (!resumeFile || analyzing) return;
        setAnalyzing(true)
        setResumeError("");

        const formdata = new FormData()
        formdata.append("resume", resumeFile)

        try {
            const result = await axios.post(ServerUrl + "/api/interview/resume", formdata, { withCredentials: true })

            console.log(result.data)

            setSavedResume(result.data);
            setSelectedResumeId(result.data.resumeId);
            setResumeChoice("new");
            setResumeFile(null);
            setRole(result.data.role || "");
            setExperience(result.data.experience || "");
            setAnalysisDone(true);

            setAnalyzing(false);

        } catch (error) {
            console.error(error.response?.data || error);
            setResumeError(error.response?.data?.message || "Could not analyze this resume. Please try another PDF.");
            setAnalyzing(false);
        }
    }

    const handleStart = async () => {
        setStartError("");
        setLoading(true)
        let audioContext = null;
        try {
           const AudioContextClass = window.AudioContext || window.webkitAudioContext;
           if (AudioContextClass) {
             audioContext = new AudioContextClass();
             if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
           }
           const result = await axios.post(ServerUrl + "/api/interview/generate-questions" , {role, experience, mode, interviewLevel, resumeId: resumeChoice === "none" ? null : selectedResumeId } , {withCredentials:true}) 
           console.log(result.data)
           setLoading(false)
           onStart(result.data, audioContext)

        } catch (error) {
            if (audioContext && audioContext.state !== "closed") audioContext.close();
            console.error("Failed to start interview:", error.response?.data || error);
            setStartError(error.response?.data?.message || "Could not start the interview. Please check your connection and try again.");
            setLoading(false)
        }
    }
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className='min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 px-4'>

            <div className='w-full max-w-6xl bg-white rounded-3xl shadow-2xl grid md:grid-cols-2 overflow-hidden'>

                <motion.div
                    initial={{ x: -80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.7 }}
                    className='relative bg-gradient-to-br from-green-50 to-green-100 p-12 flex flex-col justify-center'>

                    <h2 className="text-4xl font-bold text-gray-800 mb-6">
                        Start Your AI Interview
                    </h2>

                    <p className="text-gray-600 mb-10">
                        Practice real interview scenarios powered by AI.
                        Improve communication, technical skills, and confidence.
                    </p>

                    <div className='space-y-5'>

                        {
                            [
                                {
                                    icon: <FaUserTie className="text-green-600 text-xl" />,
                                    text: "Choose Role & Experience",
                                },
                                {
                                    icon: <FaMicrophoneAlt className="text-green-600 text-xl" />,
                                    text: "Smart Voice Interview",
                                },
                                {
                                    icon: <FaChartLine className="text-green-600 text-xl" />,
                                    text: "Performance Analytics",
                                },
                            ].map((item, index) => (
                                <motion.div key={index}
                                    initial={{ y: 30, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 + index * 0.15 }}
                                    whileHover={{ scale: 1.03 }}
                                    className='flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm cursor-pointer'>
                                    {item.icon}
                                    <span className='text-gray-700 font-medium'>{item.text}</span>

                                </motion.div>
                            ))
                        }
                    </div>



                </motion.div>



                <motion.div
                    initial={{ x: 80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.7 }}
                    className="p-12 bg-white">

                    <h2 className='text-3xl font-bold text-gray-800 mb-8'>
                        Interview SetUp
                    </h2>


                    <div className='space-y-6'>

                        <div className='relative'>
                            <FaUserTie className='absolute top-4 left-4 text-gray-400' />

                            <input type='text' placeholder='Enter role'
                                className='w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition'
                                onChange={(e) => setRole(e.target.value)} value={role} />
                        </div>


                        <div className='relative'>
                            <FaBriefcase className='absolute top-4 left-4 text-gray-400' />

                            <input type='text' placeholder='Experience (e.g. 2 years)'
                                className='w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition'
                                onChange={(e) => setExperience(e.target.value)} value={experience} />



                        </div>

                        <select value={mode}
                            onChange={(e) => setMode(e.target.value)}
                            className='w-full py-3 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition'>

                            <option value="Technical">Technical Interview</option>
                            <option value="HR">HR Interview</option>

                        </select>

                        <div>
                            <label htmlFor="interviewLevel" className="mb-2 block font-medium text-gray-700">Level of Interview</label>
                            <select id="interviewLevel" value={interviewLevel}
                                onChange={(event) => setInterviewLevel(event.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none">
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>

                        <div className='space-y-3'>
                            <p className='font-medium text-gray-700'>Resume for this interview</p>
                            <div className='grid grid-cols-2 gap-3'>
                                <button type='button'
                                    onClick={() => {
                                        if (savedResume?._id) {
                                            setResumeChoice("saved");
                                            setSelectedResumeId(savedResume._id);
                                            setAnalysisDone(false);
                                        }
                                    }}
                                    disabled={!savedResume?._id}
                                    className={`rounded-xl border p-3 text-left transition ${resumeChoice === "saved" ? "border-green-600 bg-green-50" : "border-gray-200"} disabled:opacity-50`}>
                                    <span className='block font-medium'>Use saved resume</span>
                                    <span className='block text-xs text-gray-500 mt-1'>{savedResume?.fileName || "No resume saved yet"}</span>
                                </button>
                                <button type='button'
                                    onClick={() => {
                                        setResumeChoice("new");
                                        setSelectedResumeId("");
                                        setAnalysisDone(false);
                                    }}
                                    className={`rounded-xl border p-3 text-left transition ${resumeChoice === "new" ? "border-green-600 bg-green-50" : "border-gray-200"}`}>
                                    <span className='block font-medium'>Upload a new resume</span>
                                    <span className='block text-xs text-gray-500 mt-1'>PDF, up to 5 MB</span>
                                </button>
                            </div>

                            {resumeChoice === "saved" && savedResume && (
                                <p className='text-sm text-green-700'>This interview will use {savedResume.fileName}.</p>
                            )}

                            {resumeChoice === "new" && !analysisDone && (
                                <div className='border-2 border-dashed border-gray-300 rounded-xl p-5 text-center'>
                                    <FaFileUpload className='text-3xl mx-auto text-green-600 mb-2' />
                                    <input type='file' accept='application/pdf' id='resumeUpload'
                                        onChange={(event) => {
                                            setResumeFile(event.target.files?.[0] || null);
                                            setSelectedResumeId("");
                                        }}
                                        className='block w-full text-sm text-gray-600' />
                                    {resumeFile && (
                                        <button type='button' onClick={handleUploadResume} disabled={analyzing}
                                            className='mt-3 bg-gray-900 text-white px-5 py-2 rounded-lg disabled:opacity-60'>
                                            {analyzing ? "Analyzing..." : `Analyze and save ${resumeFile.name}`}
                                        </button>
                                    )}
                                </div>
                            )}

                            {resumeChoice === "new" && analysisDone && savedResume && (
                                <p className='text-sm text-green-700'>New resume saved and selected: {savedResume.fileName}.</p>
                            )}

                            <button type='button' onClick={() => {
                                setResumeChoice("none");
                                setSelectedResumeId("");
                                setAnalysisDone(false);
                            }} className='text-sm text-gray-500 underline'>Start without a resume</button>
                        </div>
                        {startError && (
                            <p role="alert" className="text-sm text-red-600">{startError}</p>
                        )}

                        <motion.button
                        onClick={handleStart}
                            disabled={!role || !experience || loading || (resumeChoice !== "none" && !selectedResumeId) || (resumeChoice === "new" && !analysisDone)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.95 }}
                            className='w-full disabled:bg-gray-600 bg-green-600 hover:bg-green-700 text-white py-3 rounded-full text-lg font-semibold transition duration-300 shadow-md'>
                            {loading ? "Staring...":"Start Interview"}


                        </motion.button>
                    </div>

                </motion.div>
            </div>

        </motion.div>
    )
}

export default Step1SetUp
