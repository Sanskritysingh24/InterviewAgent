import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from "motion/react"
import { BsRobot } from "react-icons/bs";
import { HiOutlineLogout } from "react-icons/hi";
import { FaUserAstronaut } from "react-icons/fa";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ServerUrl } from '../App';
import { setUserData } from '../redux/userSlice';
import AuthModel from './AuthModel';
function Navbar() {
    const {userData} = useSelector((state)=>state.user)

    const [showUserPopup,setShowUserPopup] = useState(false)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [showAuth, setShowAuth] = useState(false);
    const [savedResume, setSavedResume] = useState(null);
    const [resumeBusy, setResumeBusy] = useState(false);
    const [resumeMessage, setResumeMessage] = useState("");
    const [resumeError, setResumeError] = useState("");

    useEffect(() => {
        if (!userData) {
            setSavedResume(null);
            return;
        }
        axios.get(ServerUrl + "/api/interview/resume/latest", { withCredentials: true })
            .then((result) => setSavedResume(result.data))
            .catch(() => setSavedResume(null));
    }, [userData]);

    const handleResumeUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("resume", file);
        setResumeBusy(true);
        setResumeMessage("");
        setResumeError("");
        try {
            const result = await axios.post(ServerUrl + "/api/interview/resume", formData, { withCredentials: true });
            setSavedResume(result.data);
            setResumeMessage("Resume saved and ready for your next interview.");
        } catch (error) {
            setResumeError(error.response?.data?.message || "Could not upload your resume.");
        } finally {
            setResumeBusy(false);
            event.target.value = "";
        }
    };

    const handleLogout = async () => {
        try {
            await axios.get(ServerUrl + "/api/auth/logout" , {withCredentials:true})
            dispatch(setUserData(null))

            setShowUserPopup(false)
            navigate("/")

        } catch (error) {
            console.log(error)
        }
    }
  return (
    <div className='bg-[#f3f3f3] flex justify-center px-4 pt-6'>
        <motion.div 
        initial={{opacity:0 , y:-40}}
        animate={{opacity:1 , y:0}}
        transition={{duration: 0.3}}
        className='w-full max-w-6xl bg-white rounded-[24px] shadow-sm border border-gray-200 px-8 py-4 flex justify-between items-center relative'>
            <div className='flex items-center gap-3 cursor-pointer'>
                <div className='bg-black text-white p-2 rounded-lg'>
                    <BsRobot size={18}/>

                </div>
                <h1 className='font-semibold hidden md:block text-lg'>InterviewAgent</h1>
            </div>

            <div className='flex items-center gap-6  relative'>
                <div className='relative'>
                    <button
                    onClick={()=>{
                         if(!userData){
                            setShowAuth(true)
                            return;
                        }
                        setShowUserPopup(!showUserPopup);

                    }} className='w-9 h-9 bg-black text-white rounded-full flex items-center justify-center font-semibold'>
                        {userData ? userData?.name.slice(0,1).toUpperCase() : <FaUserAstronaut size={16}/>}
                        
                    </button>

                    {showUserPopup && (
                        <div className='absolute right-0 mt-3 w-72 bg-white shadow-xl border border-gray-200 rounded-xl p-4 z-50'>
                            <p className='text-md text-blue-500 font-medium mb-1'>{userData?.name}</p>

                            <button onClick={() => { setShowUserPopup(false); navigate("/profile"); }} className='w-full rounded-lg bg-blue-50 px-3 py-2 text-left text-sm font-medium text-blue-700 hover:bg-blue-100'>Edit profile</button>

                            <div className='border-t border-gray-100 mt-2 pt-3'>
                                <p className='text-sm font-medium text-gray-800 mb-1'>Resume</p>
                                <p className='text-xs text-gray-500 mb-2'>
                                    {savedResume ? `Saved: ${savedResume.fileName}` : "No resume saved yet"}
                                </p>
                                <label className='block w-full text-center bg-gray-100 hover:bg-gray-200 rounded-lg py-2 text-sm cursor-pointer'>
                                    {resumeBusy ? "Analyzing resume..." : savedResume ? "Upload or replace resume" : "Upload a resume"}
                                    <input type='file' accept='application/pdf' className='hidden' disabled={resumeBusy} onChange={handleResumeUpload} />
                                </label>
                                {resumeMessage && <p role="status" className="text-xs text-green-700 mt-2">{resumeMessage}</p>}
                                {resumeError && <p role="alert" className="text-xs text-red-600 mt-2">{resumeError}</p>}
                            </div>
                            <button onClick={handleLogout} 
                            className='w-full text-left text-sm py-2 flex items-center gap-2 text-red-500'>
                                <HiOutlineLogout size={16}/>
                                Logout</button>
                        </div>
                    )}
                </div>

            </div>



        </motion.div>

        {showAuth && <AuthModel onClose={()=>setShowAuth(false)}/>}
      
    </div>
  )
}

export default Navbar
