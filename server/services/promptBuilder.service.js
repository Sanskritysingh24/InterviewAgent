// ===================== CONFIG =====================
import { verdictForScore } from "../../shared/scoring.js"
import { getReferenceQuestions } from "./questionBank.service.js"

export const QUESTION_COUNT = 6          // main questions
export const MAX_TOTAL_QUESTIONS = 8     // main + follow-ups milake HARD LIMIT
export const MAX_FOLLOWUPS = 2           // ek hi sawaal ki chain mein max follow-ups
export const FOLLOWUP_TIME_LIMIT = 60

// Follow-up sirf tab jab answer "beech ka" ho: adhoora/vague par kuch jaanta ho.
// Bahut achha (>=8) ya bilkul weak (<=3) answer par follow-up nahi.
export const FOLLOWUP_MIN_SCORE = 4
export const FOLLOWUP_MAX_SCORE = 7

const LEVELS = ["easy", "medium", "hard"]
export const QUESTION_CATEGORIES = ["Concepts", "Attitude", "Vocabulary", "Style"]
export const EXPERIENCE_LEVELS = ["fresher", "mid-level", "senior"]
export const LEGACY_QUESTION_CATEGORIES = ["Technical", "HR", "Behavioral", "theory", "coding", "practical", "scenario"]
export const ALL_QUESTION_CATEGORIES = [...QUESTION_CATEGORIES, ...LEGACY_QUESTION_CATEGORIES]
export const normalizeExperienceLevel = (value) => {
  const normalized = String(value || "fresher").trim().toLowerCase()
  if (["fresher", "0-1 years", "0-1", "0-2 years - fresher", "0-2 years", "0-2"].includes(normalized)) return "fresher"
  if (["mid-level", "intermediate", "2-5 years - mid-level", "2-5 years", "2-5"].includes(normalized)) return "mid-level"
  if (["senior", "experienced", "5+ years - senior", "5+ years", "5+"].includes(normalized)) return "senior"
  return null
}
const TIME_LIMIT = { easy: 60, medium: 90, hard: 120 }

const list = (arr) => (Array.isArray(arr) && arr.length ? arr.join(", ") : "None")
const bullets = (arr) => (Array.isArray(arr) && arr.length ? arr.map((x) => `- ${x}`).join("\n") : "None")

// ===================== QUESTION PLAN (resume + role + experience) =====================
const buildPlan = ({ mode, count, hasResume, hasProjects, hasSkills, role }) => {
  const projectQ = hasProjects ? Math.max(1, Math.round(count * 0.33)) : 0
  const skillQ = hasSkills ? Math.max(1, Math.round(count * 0.33)) : 0
  const scenarioQ = 1
  const roleQ = Math.max(0, count - projectQ - skillQ - scenarioQ)

  if (mode === "HR") {
    return hasResume
      ? `Use behavioural and situational questions. Cover each available resume area:
${projectQ ? `- ${projectQ} questions about named resume projects. Ask about the person's contribution, decisions, challenges, teamwork, or lessons learned.\n` : ""}${skillQ ? `- ${skillQ} questions about listed skills or technologies. Ask how the person used, learned, or applied the skill in a real situation.\n` : ""}- ${roleQ + scenarioQ} questions about motivation, career goals, and realistic situations for the ${role} role. Connect the questions to the person's stated experience level and resume when relevant.`
      : `Use behavioural and situational questions about teamwork, challenges, deadlines, learning, and motivation for the ${role} role. Match the person's stated experience level.`
  }

  return hasResume
    ? `Follow this mix for the ${count} questions:
${projectQ ? `- ${projectQ} questions about specific named projects in the resume. Ask what the person built, their contribution, a decision they made, or a problem they solved.\n` : ""}${skillQ ? `- ${skillQ} questions about specific technical skills or technologies listed in the resume. Test practical understanding and application, not only definitions.\n` : ""}${roleQ > 0 ? `- ${roleQ} questions about core concepts and practical responsibilities of the ${role} role.\n` : ""}- ${scenarioQ} harder scenario question combining the ${role} role with the person's experience and resume details when available.`
    : `Base all ${count} questions on the ${role} role and the person's experience level. Mix role fundamentals, practical work, and scenarios.`
}

// ===================== PROMPT 1: MAIN QUESTIONS =====================
export const buildQuestionPrompt = ({
  role, experience, mode, topic, difficulty, companyTrack,
  skills, projects, resumeText, roleKnowledge, companyFocus, avoidQuestions = [],
  count = QUESTION_COUNT, interviewLevel = "medium", experienceLevel = "fresher",
}) => {
  experienceLevel = normalizeExperienceLevel(experienceLevel) || "fresher"
  const hasResume =
    (Array.isArray(skills) && skills.length > 0) ||
    (Array.isArray(projects) && projects.length > 0) ||
    (resumeText && resumeText !== "None")

  const context = [
    `Target Role: ${role}`,
    `Experience Level: ${experience}`,
    `Selected Experience Band: ${experienceLevel}`,
    `Interview Mode: ${mode}`,
    `Topic Focus: ${topic || "General"}`,
    `Requested Difficulty: ${difficulty || "Intermediate"}`,
    `Selected Interview Level: ${interviewLevel}`,
    `Company Track: ${companyTrack || "General"}`,
    companyFocus?.length ? `Company Focus Areas: ${list(companyFocus)}` : null,
    roleKnowledge?.topics?.length ? `Key Topics For This Role: ${list(roleKnowledge.topics)}` : null,
    `\nResume Skills:\n${bullets(skills)}`,
    `\nResume Projects:\n${bullets(projects)}`,
    resumeText && resumeText !== "None" ? `\nResume Text (extract):\n${resumeText.slice(0, 5000)}` : null,
    avoidQuestions.length ? `\nQuestions asked in previous interviews; do not repeat or lightly rephrase them:\n${bullets(avoidQuestions)}` : null,
  ].filter(Boolean).join("\n")

  const plan = buildPlan({
    mode, count, hasResume, hasProjects: Array.isArray(projects) && projects.length > 0,
    hasSkills: Array.isArray(skills) && skills.length > 0, role,
  })
  const referenceQuestions = getReferenceQuestions({
    mode, role, skills, count, excludeQuestions: avoidQuestions,
  })
  const referenceBlock = referenceQuestions.length
    ? referenceQuestions.map((item, index) => `${index + 1}. [Topic: ${item.topic}] ${item.question}`).join("\n")
    : "No reference questions are available for this mode."

  return [
    {
      role: "system",
      content: `
You are a real human interviewer conducting a professional interview.
Speak in simple, natural English, as if you are talking directly to the person.

Generate exactly ${count} MAIN interview questions.

QUESTION PLAN:
${plan}

REFERENCE QUESTIONS:
${referenceBlock}

Personalization rules:
- Use the reference questions as the primary source. Rephrase each to fit the person's resume and experience level, following the format rules below. Do not copy verbatim when a resume project or skill fits. Only go outside the references if count exceeds the available questions.
- Every question must fit the target role and the person's stated experience level. Match complexity to their experience: fundamentals for 0-1 years, practical ownership for 2-4 years, and design trade-offs for 5+ years.
- In technical interviews, test resume skills technically. In HR interviews, ask behavioral questions about how the person used, learned, or applied those skills.
- For resume-based technical interviews, ask about specific listed skills and named projects. Ask what the person built, how they used a skill, decisions they made, challenges they solved, and results.
- Use only resume facts included in the context. Never assume the person used a tool or achieved a result that is not stated.
- Match the experience level:
  fresher (0-2 years): fundamentals and simple examples; reward correct basic reasoning.
  mid-level (2-5 years): practical application, trade-offs, and independent problem solving.
  senior (5+ years): deeper reasoning, ownership, edge cases, and stricter standards.
- Across the set, balance the question categories Concepts, Attitude, Vocabulary, and Style. Use each category at least once when count allows; use the remaining slots to fit the role and interview mode.
- Return category as one of Concepts, Attitude, Vocabulary, Style. The question wording and interview mode still determine technical, HR, or behavioral subject matter.
- Only mention skills and projects that actually appear in the resume. Never invent any.
- Prefer the skills and projects most relevant to the target role. Ignore unrelated ones.
- Never ask two questions about the same project or the same skill.
- Make this interview set distinct from every prior question provided in the context. Do not repeat a question, its core topic, or the same project/skill angle with different wording.
- Each question must open a topic that can be explored further, so avoid yes/no questions.
- If a Company Track is given, reflect that company's focus areas.

Format rules:
- Each question is ONE complete sentence of 15 to 25 words.
- Speak directly to the person using "you" and "your" (for example: "In your Shop project, how did you handle user login?"). Never say "the candidate".
- Do NOT number the questions.
- Do NOT add explanations or any extra text.
- Keep the language simple and conversational, because it will be spoken aloud.

Difficulty requirements:
- Make every main question ${interviewLevel} difficulty. Apply this selected level whether resume context is present or not.
- Easy questions should test basic concepts and straightforward examples; medium questions should test practical understanding and application; hard questions should test deeper reasoning, complex scenarios, and trade-offs.
- Keep the selected difficulty appropriate to the person's stated experience while maintaining the requested level.

Return ONLY valid JSON, no markdown, in this exact format:
{
  "questions": [
    { "text": "question here", "category": "Concepts|Attitude|Vocabulary|Style", "difficulty": "easy|medium|hard" }
  ]
}
`,
    },
    { role: "user", content: context },
  ]
}

// AI ka output validate + clean karta hai
export const normalizeQuestions = (parsed, count = QUESTION_COUNT, interviewLevel = "medium") => {
  const raw = Array.isArray(parsed?.questions) ? parsed.questions : []
  return raw
    .filter((q) => typeof q?.text === "string" && q.text.trim())
    .slice(0, count)
    .map((q, index) => {
      const difficulty = LEVELS.includes(interviewLevel) ? interviewLevel : "medium"
      return {
        text: q.text.trim(),
        category: QUESTION_CATEGORIES.includes(q.category) ? q.category : QUESTION_CATEGORIES[index % QUESTION_CATEGORIES.length],
        difficulty,
        timeLimit: TIME_LIMIT[difficulty],
      }
    })
}

// ===================== PROMPT 2: EVALUATION + FOLLOW-UP =====================
export const buildEvaluationPrompt = ({
  role, experience, mainQuestion, thread = [], currentQuestion,
  answer, followUpDepth, maxFollowUps = MAX_FOLLOWUPS, followUpsLeft = 0,
  experienceLevel = "fresher", category = "Concepts",
}) => [
  {
    role: "system",
    content: `
You evaluate one interview answer for the stated experience level and question category.
Score from 0 to 100. Be fair and specific to the role and question.
Experience level: ${experienceLevel}.
- fresher (0-2 years): score fundamentals and clear basic reasoning; do not expect senior depth.
- mid-level (2-5 years): expect practical application and independent choices.
- senior (5+ years): expect depth, ownership, trade-offs, and edge cases; apply stricter standards.
Write simple English with short sentences and no jargon. Keep each feedback point to 2-3 lines maximum.
Give one short, simple feedback sentence. Say what was good and one thing to improve. Avoid labels, jargon, and long explanations.
The ideal answer must be concise, correct, and suited to the experience level. Do not claim the person said anything absent from their answer.
Use exactly this category: ${category}.
Return ONLY valid JSON with exactly these fields and types:
{
  "score": 0,
  "verdict": "good|average|poor",
  "category": "${category}",
  "feedback": "One short, simple sentence of feedback.",
  "correctAnswer": "concise ideal answer",
  "strengths": ["string"],
  "improvements": ["string"]
}
score is an integer from 0 to 100. Verdict must match score: good >= 70, average 40-69, poor < 40.
`,
  },
  {
    role: "user",
    content: `
Role: ${role}
Experience: ${experience}
Experience band: ${experienceLevel}
Question category: ${category}
Main Question: ${mainQuestion}

Conversation so far on this question:
${thread.length
  ? thread.map((t) => `Interviewer: ${t.question}\nPerson: ${t.answer}`).join("\n")
  : "None"}

Latest Question Asked: ${currentQuestion}
Their Latest Answer: ${answer}

followUpDepth: ${followUpDepth}
maxFollowUps: ${maxFollowUps}
followUpsLeft: ${followUpsLeft}
`,
  },
]

// ===================== SAFETY HELPERS (LLM pe bharosa nahi) =====================
const clamp = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)))
const toList = (a) =>
  Array.isArray(a) ? a.map((s) => String(s).trim()).filter(Boolean).slice(0, 2) : []

// Scores ko 0-10 mein clamp karta hai, finalScore khud calculate karta hai,
// aur guarantee karta hai ki positive + improvement dono feedback hamesha ho.
export const sanitizeEvaluation = (p = {}, expectedCategory = "Concepts") => {
  const score = clamp(p.score)
  const verdict = verdictForScore(score)
  const feedback = String(p.feedback || "").trim() ||
    "You made a good attempt; add one correct detail to make your answer clearer."
  const strengths = toList(p.strengths)
  const improvements = toList(p.improvements)
  const positiveFeedback = strengths[0] || "You made an attempt to answer the question."
  const improvementFeedback = improvements[0] || "Add one clear detail and a relevant example."
  return {
    score,
    verdict,
    category: ALL_QUESTION_CATEGORIES.includes(p.category) ? p.category : expectedCategory,
    feedback,
    correctAnswer: String(p.correctAnswer || "").trim() || "Give a direct answer, explain the key idea, and support it with a relevant example.",
    strengths,
    improvements,
    // Legacy compatibility fields used by existing report and follow-up code.
    finalScore: Math.round(score / 10),
    technicalAccuracy: Math.round(score / 10),
    confidence: Math.round(score / 10),
    communication: Math.round(score / 10),
    completeness: Math.round(score / 10),
    problemSolving: null,
    positiveFeedback,
    improvementFeedback,
    needsFollowUp: verdict === "average",
    followUpQuestion: verdict === "average" ? "Can you give one clear example that shows how you would apply this?" : null,
  }
}

// BACKEND decide karta hai ki follow-up hoga ya nahi, LLM nahi.
//  depth      = is chain mein ab tak kitne follow-ups ho chuke
//  slotsLeft  = 8 ke total limit mein kitni jagah bachi hai
export const resolveFollowUp = (
  evaluation,
  depth,
  maxFollowUps = MAX_FOLLOWUPS,
  asked = [],
  slotsLeft = Infinity
) => {
  if (slotsLeft <= 0) return null                        // 8 sawaal ki limit poori
  if (depth >= maxFollowUps) return null                 // is sawaal ki chain poori
  if (!evaluation?.needsFollowUp) return null            // AI ko zarurat nahi lagi

  // Bahut achha ya bilkul weak answer -> seedha aage badho
  if (evaluation.finalScore > FOLLOWUP_MAX_SCORE) return null
  if (evaluation.finalScore < FOLLOWUP_MIN_SCORE) return null

  const q = evaluation.followUpQuestion
  if (!q || q.length < 10) return null                   // khali ya bahut chhota
  const repeated = asked.some((a) => String(a).trim().toLowerCase() === q.toLowerCase())
  if (repeated) return null                              // repeat sawaal
  return q
}
