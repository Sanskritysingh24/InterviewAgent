import fs from "node:fs";
import { fileURLToPath } from "node:url";

const bankPath = fileURLToPath(new URL("../data/questionBank.json", import.meta.url));
let cachedQuestionBank;

const loadQuestionBank = () => {
  if (!cachedQuestionBank) {
    try {
      cachedQuestionBank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
      if (!Array.isArray(cachedQuestionBank)) cachedQuestionBank = [];
    } catch (error) {
      if (error.code !== "ENOENT") console.error("Could not load interview question bank:", error.message);
      cachedQuestionBank = [];
    }
  }
  return cachedQuestionBank;
};

const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const questionTerms = (question) => new Set(
  normalize(question).split(" ").filter((word) => word.length > 2 &&
    !["what", "when", "where", "which", "who", "why", "how", "your", "you", "the", "and", "for", "with", "from", "about", "have", "has", "does", "can", "could", "would", "should", "this", "that", "into", "using", "used", "explain", "describe", "tell", "walk", "through"].includes(word))
);

const questionsAreSimilar = (left, right) => {
  const leftText = normalize(left);
  const rightText = normalize(right);
  if (leftText === rightText) return true;
  const leftTerms = questionTerms(left);
  const rightTerms = questionTerms(right);
  if (!leftTerms.size || !rightTerms.size) return false;
  const shared = [...leftTerms].filter((term) => rightTerms.has(term)).length;
  const smallest = Math.min(leftTerms.size, rightTerms.size);
  const union = new Set([...leftTerms, ...rightTerms]).size;
  return shared >= Math.max(2, Math.ceil(smallest * 0.55)) && shared / union >= 0.32;
};

const preferredTopics = (role, skills) => {
  const context = normalize([role, ...(Array.isArray(skills) ? skills : [])].join(" "));
  const topics = [];

  if (/mern|full stack|fullstack/.test(context)) {
    topics.push("DBMS and SQL", "OOP and Programming Fundamentals", "Operating System", "Data Structures & Algorithms", "Programming Languages");
  }
  if (/backend|back end|server side/.test(context)) {
    topics.push("DBMS and SQL", "OOP and Programming Fundamentals", "Operating System", "Data Structures & Algorithms", "Programming Languages");
  }
  if (/artificial intelligence|\bai\b|machine learning|\bml\b|rag|llm|generative/.test(context)) {
    topics.push("Artificial Intelligence", "RAG Architectures");
  }

  const addIfMentioned = (pattern, topic) => {
    if (pattern.test(context)) topics.push(topic);
  };
  addIfMentioned(/database|sql|dbms|mongo/, "DBMS and SQL");
  addIfMentioned(/algorithm|data structure|dsa/, "Data Structures & Algorithms");
  addIfMentioned(/operating system|\bos\b|linux|process management/, "Operating System");
  addIfMentioned(/object oriented|\boop\b|programming fundamentals/, "OOP and Programming Fundamentals");
  addIfMentioned(/java|javascript|python|programming language/, "Programming Languages");

  return [...new Set(topics)];
};

const randomSample = (items, size) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, size);
};

const rankByPreference = (items, preferred) => items
  .map((item) => ({ item, preference: preferred.indexOf(item.topic) }))
  .sort((left, right) => {
    const leftScore = left.preference === -1 ? preferred.length : left.preference;
    const rightScore = right.preference === -1 ? preferred.length : right.preference;
    return leftScore - rightScore;
  })
  .map(({ item }) => item);

export const getReferenceQuestions = ({ mode, role, skills, count, excludeQuestions = [] }) => {
  const excluded = excludeQuestions.map(normalize).filter(Boolean);
  const preferred = preferredTopics(role, skills);
  const matching = loadQuestionBank()
    .filter((item) => item.mode === mode && item.question &&
      !excluded.some((question) => questionsAreSimilar(item.question, question)));
  return randomSample(rankByPreference(matching, preferred), Math.max(0, Number(count) || 0) * 2);
};

// Always provide a full set from the local bank when the AI service is unavailable
// or returns incomplete/repeated questions. Relax similarity only if needed to fill it.
export const getFallbackQuestions = ({ mode, role, skills, count, excludeQuestions = [] }) => {
  const targetCount = Math.max(0, Number(count) || 0);
  const preferred = preferredTopics(role, skills);
  const available = loadQuestionBank().filter((item) => item.mode === mode && item.question);
  const strictExcluded = excludeQuestions.filter(Boolean);
  const fresh = available.filter((item) =>
    !strictExcluded.some((question) => questionsAreSimilar(item.question, question))
  );
  const selected = randomSample(rankByPreference(fresh, preferred), targetCount);

  if (selected.length >= targetCount) return selected;

  const remaining = available
    .filter((item) => !selected.some((chosen) => normalize(chosen.question) === normalize(item.question)))
    .sort((left, right) => {
      const leftRepeats = strictExcluded.filter((question) => questionsAreSimilar(left.question, question)).length;
      const rightRepeats = strictExcluded.filter((question) => questionsAreSimilar(right.question, question)).length;
      return leftRepeats - rightRepeats;
    });
  return [...selected, ...randomSample(rankByPreference(remaining, preferred), targetCount - selected.length)];
};

