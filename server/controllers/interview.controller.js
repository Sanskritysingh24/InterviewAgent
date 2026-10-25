import fs from "fs"
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { askAi } from "../services/openRouter.service.js";
import User from "../models/user.model.js";
import Interview from "../models/interview.model.js";
import Role from "../models/role.model.js";
import CompanyTrack from "../models/companyTrack.model.js";
import Question from "../models/question.model.js";
import Response from "../models/response.model.js";
import Resume from "../models/resume.model.js";
import {
  buildQuestionPrompt,
  buildEvaluationPrompt,
  normalizeQuestions,
  sanitizeEvaluation,
  resolveFollowUp,
  QUESTION_COUNT,
  MAX_TOTAL_QUESTIONS,
  MAX_FOLLOWUPS,
  FOLLOWUP_TIME_LIMIT,
} from "../services/promptBuilder.service.js";
import { parseAiJson } from "../utils/parseAiJson.js";
import { syncUserGamification } from "../services/gamification.service.js";

const ALLOWED_DIFFICULTY = ["Beginner", "Intermediate", "Advanced"]
const CI = { locale: "en", strength: 2 }   // case-insensitive match
const QUESTION_STOP_WORDS = new Set(["what", "when", "where", "which", "who", "why", "how", "your", "you", "the", "and", "for", "with", "from", "about", "have", "has", "had", "does", "did", "can", "could", "would", "should", "this", "that", "into", "using", "used", "explain", "describe", "tell", "walk", "through", "during", "experience", "approach"]);

const questionTerms = (question) => new Set(
  String(question).toLowerCase().match(/[a-z0-9+#.]{2,}/g)?.filter((word) => !QUESTION_STOP_WORDS.has(word)) || []
);

const questionsAreSimilar = (left, right) => {
  const normalize = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (normalize(left) === normalize(right)) return true;

  const leftTerms = questionTerms(left);
  const rightTerms = questionTerms(right);
  if (!leftTerms.size || !rightTerms.size) return false;
  const shared = [...leftTerms].filter((term) => rightTerms.has(term)).length;
  const smallest = Math.min(leftTerms.size, rightTerms.size);
  const union = new Set([...leftTerms, ...rightTerms]).size;
  return shared >= Math.max(2, Math.ceil(smallest * 0.55)) && shared / union >= 0.32;
};

const findRepeatedQuestions = (questions, previousQuestions) => {
  const seen = [];
  for (const question of questions) {
    if (previousQuestions.some((previous) => questionsAreSimilar(question.text, previous)) ||
        seen.some((previous) => questionsAreSimilar(question.text, previous))) {
      return question.text;
    }
    seen.push(question.text);
  }
  return null;
};

// Extra collections (Resume/Question/Response) fail ho jayein toh bhi interview na ruke
const safe = async (fn, label) => {
  try {
    return await fn()
  } catch (e) {
    console.error(`[${label}] failed:`, e.message)
    return null
  }
}


// =====================================================================
// 1. RESUME ANALYSIS
// =====================================================================
export const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume required" });
    }
    const filepath = req.file.path

    const fileBuffer = await fs.promises.readFile(filepath)
    const uint8Array = new Uint8Array(fileBuffer)

    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

    let resumeText = "";

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      const pageText = content.items.map(item => item.str).join(" ");
      resumeText += pageText + "\n";
    }

    resumeText = resumeText
      .replace(/\s+/g, " ")
      .trim();

    const messages = [
      {
        role: "system",
        content: `
You are a resume parser. Extract data ONLY from what is written in the resume. Never invent anything.

Return strictly JSON:

{
  "role": "the job role this person is targeting or best suited for, e.g. Frontend Developer",
  "experience": "Fresher, or years of experience such as 2 years",
  "skills": ["programming languages and core technical skills, maximum 10"],
  "technologies": ["frameworks, libraries, databases, tools and cloud services, maximum 10"],
  "projects": ["Project Name: what it does in one line (tech stack used)"]
}

Rules:
- List every project in the resume (maximum 5). Each project is ONE string with the name, what it does, and its tech stack. Keep each under 25 words.
- Put the most job-relevant skills first.
- If something is missing in the resume, use an empty array or an empty string.
`
      },
      {
        role: "user",
        content: resumeText.slice(0, 8000)
      }
    ];

    const aiResponse = await askAi(messages, { json: true })
    const parsed = parseAiJson(aiResponse);

    fs.unlinkSync(filepath)

    // Resume collection mein save
    const skillList = Array.isArray(parsed.skills) ? parsed.skills : []
    const techList = Array.isArray(parsed.technologies) ? parsed.technologies : []
    const allSkills = [...new Set([...skillList, ...techList])]      // skills + technologies ek saath
    const projectList = Array.isArray(parsed.projects) ? parsed.projects : []

    const savedResume = await Resume.create({
      userId: req.userId,
      fileName: req.file.originalname,
      resumeText,
      role: parsed.role || "",
      experience: parsed.experience || "",
      skills: skillList,
      technologies: techList,
      projects: projectList,
    });

    res.json({
      resumeId: savedResume._id,
      fileName: savedResume.fileName,
      role: parsed.role,
      experience: parsed.experience,
      projects: projectList,
      skills: allSkills,
      resumeText
    });

  } catch (error) {
    console.error(error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({ message: error.message });
  }
};


export const getLatestResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select("fileName role experience skills technologies projects resumeText createdAt");

    return res.json(resume);
  } catch (error) {
    return res.status(500).json({ message: `Failed to get saved resume: ${error.message}` });
  }
};

// =====================================================================
// 2. GENERATE MAIN QUESTIONS (Prompt Builder -> OpenRouter -> JSON)
// =====================================================================
export const generateQuestion = async (req, res) => {
  try {
    let { role, experience, mode, topic, difficulty, companyTrack, resumeId, interviewLevel } = req.body

    role = role?.trim();
    experience = experience?.trim();
    mode = mode?.trim();
    topic = topic?.trim() || "";
    companyTrack = companyTrack?.trim() || "";
    difficulty = ALLOWED_DIFFICULTY.includes(difficulty) ? difficulty : "Intermediate";
    const INTERVIEW_LEVELS = ["easy", "medium", "hard"];
    interviewLevel = typeof interviewLevel === "string" ? interviewLevel.trim().toLowerCase() : "medium";
    if (!INTERVIEW_LEVELS.includes(interviewLevel)) {
      return res.status(400).json({ message: "Interview level must be Easy, Medium, or Hard." });
    }

    if (!role || !experience || !mode) {
      return res.status(400).json({ message: "Role, Experience and Mode are required." })
    }

    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: "User not found." });
    let savedResume = null;
    if (resumeId) {
      savedResume = await Resume.findOne({ _id: resumeId, userId: user._id });
      if (!savedResume) return res.status(404).json({ message: "Selected resume was not found." });
    }
    const resumeText = savedResume?.resumeText || "";
    const projects = savedResume?.projects || [];
    const skills = [...new Set([...(savedResume?.skills || []), ...(savedResume?.technologies || [])])];

    const roleDoc = await safe(() => Role.findOne({ name: role }).collation(CI), "Role.findOne")
    const companyDoc = companyTrack
      ? await safe(() => CompanyTrack.findOne({ company: companyTrack }).collation(CI), "CompanyTrack.findOne")
      : null

    // Compare every prior interview and question set for this user, across roles and modes.
    const recentInterviews = await Interview.find({ userId: user._id })
      .collation(CI)
      .sort({ createdAt: -1 })
      .select("questions.question");
    const historicalQuestions = recentInterviews.flatMap((item) =>
      item.questions.map((question) => question.question).filter(Boolean)
    );

    let questions = [];
    let repeatedQuestion = null;
    let retryQuestions = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const avoidQuestions = [...new Set([...retryQuestions, ...historicalQuestions])].slice(0, 100);
      const messages = buildQuestionPrompt({
        role, experience, mode, topic, difficulty, companyTrack,
        skills, projects, resumeText,
        roleKnowledge: roleDoc,
        companyFocus: companyDoc?.focusAreas,
        avoidQuestions,
        count: QUESTION_COUNT,
        interviewLevel,
      });
      const aiResponse = await askAi(messages, { json: true, temperature: 0.9 });
      const generated = normalizeQuestions(parseAiJson(aiResponse), QUESTION_COUNT, interviewLevel);
      repeatedQuestion = findRepeatedQuestions(generated, [...historicalQuestions, ...retryQuestions]);

      if (generated.length === QUESTION_COUNT && !repeatedQuestion) {
        questions = generated;
        break;
      }
      retryQuestions = [...retryQuestions, ...generated.map((question) => question.text)];
    }

    if (questions.length !== QUESTION_COUNT) {
      return res.status(503).json({
        message: "Could not generate a complete set of fresh questions. Please try starting the interview again.",
      });
    }
    const interview = await Interview.create({
      userId: user._id,
      role,
      experience,
      mode,
      topic,
      difficulty,
      companyTrack,
      resumeId: savedResume?._id,
      resumeText: resumeText?.trim() || "None",

      // State machine
      conversationState: "ASKING_MAIN",
      currentQuestion: 0,
      followUpDepth: 0,
      maxFollowUps: MAX_FOLLOWUPS,
      maxTotalQuestions: MAX_TOTAL_QUESTIONS,

      questions: questions.map((q) => ({
        question: q.text,
        category: q.category,
        difficulty: q.difficulty,
        timeLimit: q.timeLimit,
        isFollowUp: false,
        depth: 0,
      })),
    })

    // Questions collection mein main questions (parentQuestionId = null)
    const questionDocs = await safe(() => Question.insertMany(
      questions.map((q, i) => ({
        interviewId: interview._id,
        text: q.text,
        type: "main",
        parentQuestionId: null,
        depth: 0,
        category: q.category,
        difficulty: q.difficulty,
        timeLimit: q.timeLimit,
        order: i,
      }))
    ), "Question.insertMany")

    if (questionDocs) {
      interview.questions.forEach((q, i) => { q.questionId = questionDocs[i]._id })
      await interview.save()
    }

    res.json({
      interviewId: interview._id,

      userName: user.name,
      questions: interview.questions
    });
  } catch (error) {
    return res.status(500).json({ message: `failed to create interview ${error}` })
  }
}


// =====================================================================
// 3. SUBMIT ANSWER (evaluation + follow-up state machine)
// =====================================================================
export const submitAnswer = async (req, res) => {
  try {
    const { interviewId, questionIndex, answer, timeTaken } = req.body

    // Sirf apna interview
    const interview = await Interview.findOne({ _id: interviewId, userId: req.userId })
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" })
    }

    const idx = Number(questionIndex)
    const question = interview.questions[idx]
    if (!question) {
      return res.status(400).json({ message: "Invalid question index" })
    }

    // Double-submit guard (timer + click dono chal jayein toh follow-up do baar na bane)
    if (question.feedback) {
      return res.json({ feedback: question.feedback, followUp: null, questions: interview.questions })
    }

    const nextIdx = idx + 1

    // ---------- Case 1: answer nahi diya ----------
    if (!answer || !answer.trim()) {
      question.score = 0;
      question.feedback = "You did not submit an answer. Let's move on to the next question.";
      question.answer = "";

      interview.followUpDepth = 0
      interview.currentQuestion = nextIdx
      interview.conversationState = nextIdx >= interview.questions.length ? "EVALUATING" : "ASKING_MAIN"
      await interview.save();

      return res.json({ feedback: question.feedback, followUp: null, questions: interview.questions });
    }

    // ---------- Case 2: time khatam ----------
    if (timeTaken > question.timeLimit) {
      question.score = 0;
      question.feedback = "Time limit exceeded. Answer not evaluated.";
      question.answer = answer;

      interview.followUpDepth = 0
      interview.currentQuestion = nextIdx
      interview.conversationState = nextIdx >= interview.questions.length ? "EVALUATING" : "ASKING_MAIN"
      await interview.save();

      return res.json({ feedback: question.feedback, followUp: null, questions: interview.questions });
    }

    // ---------- Case 3: normal evaluation ----------
    const depth = question.depth || 0     // is question tak kitne follow-ups ho chuke hain

    // Is main question ki chain nikalo (main + uske follow-ups)
    let mainIdx = idx
    while (mainIdx > 0 && interview.questions[mainIdx]?.isFollowUp) mainIdx--
    const chain = interview.questions.slice(mainIdx, idx)     // abhi wale se pehle ke
    const thread = chain.map((q) => ({ question: q.question, answer: q.answer || "" }))
    const asked = interview.questions.slice(mainIdx, idx + 1).map((q) => q.question)

    interview.conversationState = "EVALUATING"

    // 8 sawaal ki total limit: kitni jagah bachi hai (main + follow-ups milake)
    const totalLimit = interview.maxTotalQuestions || MAX_TOTAL_QUESTIONS
    const slotsLeft = Math.max(0, totalLimit - interview.questions.length)

    const messages = buildEvaluationPrompt({
      role: interview.role,
      experience: interview.experience,
      mainQuestion: interview.questions[mainIdx].question,
      thread,
      currentQuestion: question.question,
      answer,
      followUpDepth: depth,
      maxFollowUps: interview.maxFollowUps,
      followUpsLeft: slotsLeft,
    })

    const aiResponse = await askAi(messages, { json: true })
    const ev = sanitizeEvaluation(parseAiJson(aiResponse))

    // Embedded question mein result (purana frontend/report chalta rahe)
    question.answer = answer;
    question.confidence = ev.confidence;
    question.communication = ev.communication;
    question.correctness = ev.technicalAccuracy;   // report page 'correctness' padhta hai
    question.completeness = ev.completeness;
    question.problemSolving = ev.problemSolving;
    question.score = ev.finalScore;
    question.positiveFeedback = ev.positiveFeedback;
    question.improvementFeedback = ev.improvementFeedback;
    question.feedback = `${ev.positiveFeedback} ${ev.improvementFeedback}`;

    // ----- FOLLOW-UP: backend decide karta hai -----
    const followUpText = resolveFollowUp(ev, depth, interview.maxFollowUps, asked, slotsLeft)

    if (followUpText) {
      const followUpDoc = await safe(() => Question.create({
        interviewId: interview._id,
        text: followUpText,
        type: "followUp",
        parentQuestionId: question.questionId || null,
        depth: depth + 1,
        category: question.category,
        difficulty: question.difficulty,
        timeLimit: FOLLOWUP_TIME_LIMIT,
      }), "Question.create(followup)")

      // Follow-up ko current question ke turant baad insert karo
      interview.questions.splice(nextIdx, 0, {
        question: followUpText,
        category: question.category,
        difficulty: question.difficulty,
        timeLimit: FOLLOWUP_TIME_LIMIT,
        isFollowUp: true,
        depth: depth + 1,
        questionId: followUpDoc?._id,
      })

      interview.conversationState = "ASKING_FOLLOWUP"
      interview.followUpDepth = depth + 1
    } else {
      // Limit poori ya zarurat nahi -> agla main question
      interview.followUpDepth = 0
      interview.conversationState = nextIdx >= interview.questions.length ? "EVALUATING" : "ASKING_MAIN"
    }
    interview.currentQuestion = nextIdx

    await interview.save();

    // Response collection mein detailed record
    await safe(() => Response.create({
      interviewId: interview._id,
      questionId: question.questionId,
      userId: req.userId,
      answer,
      timeTaken,
      technicalAccuracy: ev.technicalAccuracy,
      confidence: ev.confidence,
      communication: ev.communication,
      completeness: ev.completeness,
      problemSolving: ev.problemSolving,
      score: ev.finalScore,
      strengths: ev.strengths,
      improvements: ev.improvements,
      encouragement: ev.positiveFeedback,
    }), "Response.create")

    return res.status(200).json({
      feedback: question.feedback,
      positiveFeedback: ev.positiveFeedback,
      improvementFeedback: ev.improvementFeedback,
      followUp: followUpText ? { question: followUpText, depth: depth + 1 } : null,
      questions: interview.questions,     // frontend isse apni list update karega
    })
  } catch (error) {
    return res.status(500).json({ message: `failed to submit answer ${error}` })
  }
}


// =====================================================================
// 4. FINISH INTERVIEW
// =====================================================================
export const finishInterview = async (req, res) => {
  try {
    const { interviewId } = req.body
    const interview = await Interview.findOne({ _id: interviewId, userId: req.userId })
    if (!interview) {
      return res.status(400).json({ message: "failed to find Interview" })
    }

    const totalQuestions = interview.questions.length;

    let totalScore = 0;
    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
      totalScore += q.score || 0;
      totalConfidence += q.confidence || 0;
      totalCommunication += q.communication || 0;
      totalCorrectness += q.correctness || 0;
    });

    const finalScore = totalQuestions ? totalScore / totalQuestions : 0;
    const avgConfidence = totalQuestions ? totalConfidence / totalQuestions : 0;
    const avgCommunication = totalQuestions ? totalCommunication / totalQuestions : 0;
    const avgCorrectness = totalQuestions ? totalCorrectness / totalQuestions : 0;

    interview.finalScore = finalScore;
    if (interview.status !== "completed") interview.completedAt = new Date();
    interview.status = "completed";
    interview.conversationState = "COMPLETED";

    await interview.save();
    const gamification = await syncUserGamification(req.userId);

    return res.status(200).json({
      finalScore: Number(finalScore.toFixed(1)),
      confidence: Number(avgConfidence.toFixed(1)),
      communication: Number(avgCommunication.toFixed(1)),
      correctness: Number(avgCorrectness.toFixed(1)),
      gamification,
      questionWiseScore: interview.questions.map((q) => ({
        question: q.question,
        isFollowUp: q.isFollowUp || false,
        score: q.score || 0,
        feedback: q.feedback || "",
        positiveFeedback: q.positiveFeedback || "",
        improvementFeedback: q.improvementFeedback || "",
        confidence: q.confidence || 0,
        communication: q.communication || 0,
        correctness: q.correctness || 0,
      })),
    })
  } catch (error) {
    return res.status(500).json({ message: `failed to finish Interview ${error}` })
  }
}


// =====================================================================
// 5. HISTORY + REPORT
// =====================================================================
export const getMyInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select("role experience mode finalScore status createdAt");

    return res.status(200).json(interviews)

  } catch (error) {
    return res.status(500).json({ message: `failed to find currentUser Interview ${error}` })
  }
}

export const getDashboardData = async (req, res) => {
  try {
    const gamification = await syncUserGamification(req.userId);
    const interviews = await Interview.find({ userId: req.userId, status: "completed" })
      .sort({ createdAt: -1 })
      .select("role experience mode finalScore status createdAt resumeId questions")
      .lean();

    const resumeIds = [...new Set(interviews.map((item) => item.resumeId?.toString()).filter(Boolean))];
    const resumes = resumeIds.length
      ? await Resume.find({ _id: { $in: resumeIds }, userId: req.userId }).select("skills technologies").lean()
      : [];
    const skillsByResume = new Map(resumes.map((resume) => [resume._id.toString(),
      [...new Set([...(resume.skills || []), ...(resume.technologies || [])])]
    ]));

    const average = (questions, field) => {
      const values = questions.map((question) => question[field])
        .filter((value) => typeof value === "number" && Number.isFinite(value));
      return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : null;
    };

    const skillText = (value) => ` ${String(value).toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim()} `;
    const mentionsSkill = (text, skill) => skillText(text).includes(skillText(skill));

    const dashboardInterviews = interviews.map((interview) => {
      const questions = interview.questions || [];
      const resumeSkills = skillsByResume.get(interview.resumeId?.toString()) || [];
      const skillScores = resumeSkills.flatMap((name) => {
        if (!name || !questions.some((question) => mentionsSkill(question.question || "", name))) return [];
        const matchingScores = questions
          .filter((question) => mentionsSkill(question.question || "", name))
          .map((question) => question.score)
          .filter((score) => typeof score === "number" && Number.isFinite(score));
        return matchingScores.length ? [{
          name,
          score: Number((matchingScores.reduce((sum, score) => sum + score, 0) / matchingScores.length).toFixed(1)),
        }] : [];
      });

      return {
        _id: interview._id,
        role: interview.role,
        experience: interview.experience,
        mode: interview.mode,
        createdAt: interview.createdAt,
        scores: {
          overall: interview.finalScore ?? 0,
          technical: average(questions, "correctness"),
          communication: average(questions, "communication"),
          confidence: average(questions, "confidence"),
          problemSolving: average(questions, "problemSolving"),
        },
        skillScores,
      };
    });

    return res.status(200).json({ interviews: dashboardInterviews, gamification });
  } catch (error) {
    return res.status(500).json({ message: `Failed to load dashboard data: ${error.message}` });
  }
};
export const getInterviewReport = async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.userId })

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    const totalQuestions = interview.questions.length;

    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
      totalConfidence += q.confidence || 0;
      totalCommunication += q.communication || 0;
      totalCorrectness += q.correctness || 0;
    });

    const avgConfidence = totalQuestions ? totalConfidence / totalQuestions : 0;
    const avgCommunication = totalQuestions ? totalCommunication / totalQuestions : 0;
    const avgCorrectness = totalQuestions ? totalCorrectness / totalQuestions : 0;

    return res.json({
      finalScore: interview.finalScore,
      confidence: Number(avgConfidence.toFixed(1)),
      communication: Number(avgCommunication.toFixed(1)),
      correctness: Number(avgCorrectness.toFixed(1)),
      questionWiseScore: interview.questions
    });

  } catch (error) {
    return res.status(500).json({ message: `failed to find currentUser Interview report ${error}` })
  }
}
