
import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth"
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "interviewagent-ffd62.firebaseapp.com",
  projectId: "interviewagent-ffd62",
  storageBucket: "interviewagent-ffd62.firebasestorage.app",
  messagingSenderId: "456130434997",
  appId: "1:456130434997:web:058e9c2ef8788c1872ebfc"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider()

export {auth , provider}