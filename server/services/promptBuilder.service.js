// ===================== CONFIG =====================
export const QUESTION_COUNT = 6          // main questions
export const MAX_TOTAL_QUESTIONS = 8     // main + follow-ups milake HARD LIMIT
export const MAX_FOLLOWUPS = 2           // ek hi sawaal ki chain mein max follow-ups
export const FOLLOWUP_TIME_LIMIT = 60

// Follow-up sirf tab jab answer "beech ka" ho: adhoora/vague par kuch jaanta ho.
// Bahut achha (>=8) ya bilkul weak (<=3) answer par follow-up nahi.
export const FOLLOWUP_MIN_SCORE = 4
export const FOLLOWUP_MAX_SCORE = 7

const LEVELS = ["easy", "medium", "hard"]
const CATEGORIES = ["theory", "coding", "practical", "scenario"]
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
  count = QUESTION_COUNT, interviewLevel = "medium",
}) => {
  const hasResume =
    (Array.isArray(skills) && skills.length > 0) ||
    (Array.isArray(projects) && projects.length > 0) ||
    (resumeText && resumeText !== "None")

  const context = [
    `Target Role: ${role}`,
    `Experience Level: ${experience}`,
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

  return [
    {
      role: "system",
      content: `
You are a real human interviewer conducting a professional interview.
Speak in simple, natural English, as if you are talking directly to the person.

Generate exactly ${count} MAIN interview questions.

QUESTION PLAN:
${plan}

Personalization rules:
- Every question must fit the target role and the person's stated experience level. Match complexity to their experience: fundamentals for 0-1 years, practical ownership for 2-4 years, and design trade-offs for 5+ years.
- In technical interviews, test resume skills technically. In HR interviews, ask behavioral questions about how the person used, learned, or applied those skills.
- For resume-based technical interviews, ask about specific listed skills and named projects. Ask what the person built, how they used a skill, decisions they made, challenges they solved, and results.
- Use only resume facts included in the context. Never assume the person used a tool or achieved a result that is not stated.
- Match the experience level:
  Fresher or 0-1 years: fundamentals and basic concepts.
  2-4 years: practical, hands-on work and real problems.
  5+ years: design decisions, trade-offs, and ownership.
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
    { "text": "question here", "category": "theory|coding|practical|scenario", "difficulty": "easy|medium|hard" }
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
    .map((q) => {
      const difficulty = LEVELS.includes(interviewLevel) ? interviewLevel : "medium"
      return {
        text: q.text.trim(),
        category: CATEGORIES.includes(q.category) ? q.category : "theory",
        difficulty,
        timeLimit: TIME_LIMIT[difficulty],
      }
    })
}

// ===================== PROMPT 2: EVALUATION + FOLLOW-UP =====================
export const buildEvaluationPrompt = ({
  role, experience, mainQuestion, thread = [], currentQuestion,
  answer, followUpDepth, maxFollowUps = MAX_FOLLOWUPS, followUpsLeft = 0,
}) => [
  {
    role: "system",
    content: `
You are a professional human interviewer sitting face to face with the person you are interviewing. You have just heard their answer.
Do three things: (1) evaluate the answer honestly, (2) give balanced feedback, (3) decide whether a follow-up question is really needed.

PART 1: EVALUATION
Score these from 0 to 10: technicalAccuracy, confidence, communication, completeness, and problemSolving.
problemSolving rates how clearly the person breaks down the problem, chooses an approach, and reasons through edge cases.
Keep finalScore compatible with existing reports: average technicalAccuracy, confidence, communication, and completeness, rounded to the nearest whole number.
Be realistic. A weak answer gets a low score, a strong and detailed answer gets a high score.

PART 2: FEEDBACK (always give BOTH positive and negative points)
You are talking DIRECTLY to this person, as in a real conversation, and your words will be spoken aloud to them.
- Always speak in second person: use "you" and "your".
- NEVER say "the candidate", "the interviewee", "the user", "he", "she" or "they" when talking about the person.
  Wrong: "The candidate explained props well but missed how state works."
  Right: "You explained props well, but you missed how state works."
- Sound warm, natural and human. Do not sound like a written report.
- positiveFeedback: one specific thing the person did well, based on what they actually said. Maximum 15 words.
- improvementFeedback: one specific thing that was wrong, missing, or could be better. Maximum 20 words.
- Even for a weak answer, find one genuine positive, such as a correct basic idea or an honest attempt. Never invent praise.
- Even for a strong answer, give one small improvement.
- Never give only negative feedback.
- Also give "strengths" and "improvements" as short lists (maximum 2 items each) for the final report.

PART 3: FOLLOW-UP DECISION
Most answers do NOT need a follow-up. The DEFAULT is needsFollowUp = false.
You are told followUpDepth (follow-ups already asked on this main question), maxFollowUps, and followUpsLeft (how many follow-ups are still allowed in the WHOLE interview).

Set needsFollowUp = true ONLY when a follow-up is really valuable, meaning ALL of these are true:
- followUpDepth is less than maxFollowUps AND followUpsLeft is at least 1.
- The answer is partly correct or vague (roughly a finalScore of 4 to 7), OR the person made an interesting claim about their own project or skill that deserves a closer look.
- One short question can clearly fill the gap.
- It is not a repeat of anything already asked.
Be selective. Save follow-ups for the answers where they truly help, because you only have a few in the whole interview.

Set needsFollowUp = false when ANY of these is true:
- The answer is already good or complete (roughly a finalScore of 8 or more). Just move on.
- The person clearly does not know this topic, or gave a very weak answer (roughly a finalScore of 3 or less). Do not keep pushing, just move on.
- followUpsLeft is 0, or followUpDepth has reached maxFollowUps.
- The answer is off topic or empty.

Follow-up question rules:
- Base it on the person's actual words in the latest answer and the conversation so far.
- ONE sentence of 10 to 25 words, simple and conversational.
- Go deeper (why, how, example, edge case). Do not repeat the question and do not jump to a new topic.
- Do not reveal the correct answer.
- Ask it naturally, as part of the same conversation, by referring to what the person just said. Example: "You mentioned state, so how does React decide when to re-render?"
- NEVER announce it. Do not use words like "follow-up", "next question", "let me ask", "another question" or "one more question".
- Speak directly to the person with "you" and "your".
- If needsFollowUp is false, followUpQuestion must be null.

Return ONLY valid JSON, no markdown, in this exact format:
{
  "technicalAccuracy": number,
  "confidence": number,
  "communication": number,
  "completeness": number,
  "problemSolving": number,
  "finalScore": number,
  "positiveFeedback": "string",
  "improvementFeedback": "string",
  "strengths": ["string"],
  "improvements": ["string"],
  "needsFollowUp": boolean,
  "followUpQuestion": "string or null"
}
`,
  },
  {
    role: "user",
    content: `
Role: ${role}
Experience: ${experience}
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
const clamp = (v) => Math.max(0, Math.min(10, Math.round(Number(v) || 0)))
const toList = (a) =>
  Array.isArray(a) ? a.map((s) => String(s).trim()).filter(Boolean).slice(0, 2) : []

// Scores ko 0-10 mein clamp karta hai, finalScore khud calculate karta hai,
// aur guarantee karta hai ki positive + improvement dono feedback hamesha ho.
export const sanitizeEvaluation = (p = {}) => {
  const technicalAccuracy = clamp(p.technicalAccuracy)
  const confidence = clamp(p.confidence)
  const communication = clamp(p.communication)
  const completeness = clamp(p.completeness)
  const problemSolving = p.problemSolving != null && p.problemSolving !== "" && Number.isFinite(Number(p.problemSolving)) ? clamp(p.problemSolving) : null
  const finalScore = Math.round((technicalAccuracy + confidence + communication + completeness) / 4)

  return {
    technicalAccuracy,
    confidence,
    communication,
    completeness,
    problemSolving,
    finalScore,
    positiveFeedback:
      String(p.positiveFeedback || "").trim() || "You made a genuine attempt at this question.",
    improvementFeedback:
      String(p.improvementFeedback || "").trim() || "Try adding more detail and a real example next time.",
    strengths: toList(p.strengths),
    improvements: toList(p.improvements),
    needsFollowUp: p.needsFollowUp === true || p.needsFollowUp === "true",
    followUpQuestion:
      typeof p.followUpQuestion === "string"
        ? p.followUpQuestion.replace(/^\s*(follow[\s-]?up( question)?|next question)\s*[:\-]\s*/i, "").trim()
        : null,
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
