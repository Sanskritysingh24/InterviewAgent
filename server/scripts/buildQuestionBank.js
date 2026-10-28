import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pdfParse from "pdf-parse";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(scriptDir, "../data");
const outputPath = path.join(dataDir, "questionBank.json");
const sources = [
  { file: "2026-27_Sample_Interview_Questions.pdf", mode: "HR" },
  { file: "Artificial Intelligence.pdf", mode: "Technical" },
  { file: "Data Structures & Algorithms.pdf", mode: "Technical" },
  { file: "DBMS and SQL.pdf", mode: "Technical" },
  { file: "OOP and Programming Fundamentals.pdf", mode: "Technical" },
  { file: "Operating System.pdf", mode: "Technical" },
  { file: "Programming Languages.pdf", mode: "Technical" },
  { file: "RAG Architectures.pdf", mode: "Technical" },
];

const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const cleanQuestion = (value) => value
  .replace(/\s+/g, " ")
  .replace(/^\s*(?:(?:question|q)\s*)?\d{1,3}\s*[.)\-:]\s*/i, "")
  .replace(/^\s*(?:question|interview question)\s*:\s*/i, "")
  .trim();

const categoryFor = (question, mode) => {
  if (mode === "HR") return /explain|describe|tell me|give an example|situation/i.test(question) ? "Attitude" : "Style";
  if (/what does .* mean|define|meaning of/i.test(question)) return "Vocabulary";
  if (/explain|describe|walk me through/i.test(question)) return "Style";
  return "Concepts";
};

const difficultyFor = (question, mode) => {
  if (/design|architecture|trade.?off|concurren|distributed|optimi[sz]|scalab|deadlock|prove/i.test(question)) return "senior";
  if (mode === "HR" || /what is|what are|define|name|which|difference between/i.test(question)) return "fresher";
  return "mid";
};

const questionMarkQuestions = (text, mode) => {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const numbered = new Set();
  const questions = [];
  let segment = [];
  let active = false;

  const flush = () => {
    if (!active) return;
    const candidate = segment.join(" ");
    const questionEnd = candidate.indexOf("?");
    if (questionEnd !== -1 || mode === "HR") {
      const cleaned = cleanQuestion(questionEnd === -1 ? candidate : candidate.slice(0, questionEnd + 1));
      if (cleaned.length >= 8) questions.push(cleaned);
    }
    segment = [];
    active = false;
  };

  for (const line of lines) {
    const numberOnly = line.match(/^(\d{1,3})\s*[.)]?$/);
    const numberedText = line.match(/^(\d{1,3})\s*[.)]?\s+(.+)$/);
    if (numberOnly || numberedText) {
      flush();
      const marker = numberOnly?.[1] || numberedText?.[1];
      if (numbered.has(marker)) continue;
      numbered.add(marker);
      active = true;
      if (numberedText) segment.push(numberedText[2]);
      continue;
    }
    if (active) {
      segment.push(line);
      if (line.includes("?")) flush();
    }
  }
  flush();
  return questions;
};

const conceptsFromNonQa = (text, topic) => {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const concepts = [];
  let inCoveredTopics = false;

  for (const line of lines) {
    if (/topics covered|key concepts|concepts covered/i.test(line)) {
      inCoveredTopics = true;
      continue;
    }
    if (inCoveredTopics && /starter code|solution|output|explanation|scenario/i.test(line)) inCoveredTopics = false;
    if (inCoveredTopics && line.length <= 90) {
      const concept = line.replace(/^[•●▪\-*]\s*/, "").trim();
      if (/^[A-Z][\w ()/.'&+-]+$/.test(concept)) concepts.push(concept);
    }

    const architectureHeading = line.match(/^\d{1,2}\s*[.)]\s*(.+)$/);
    if (architectureHeading) {
      const title = architectureHeading[1].trim();
      if (title.length <= 80 && !/^(?:question|example|usage|best when|topics covered|decides|calls|may |aggregates|produces)/i.test(title)) concepts.push(title);
    }
    const scenarioTitle = line.match(/^Question\s*\d+\s*:\s*(.+?)(?:\s+Scenario)?$/i);
    if (scenarioTitle) concepts.push(scenarioTitle[1].trim());
  }

  return [...new Set(concepts.map((item) => item.trim()).filter((item) => item.length > 2 && /[A-Za-z]{3}/.test(item)))]
    .map((concept) => {
      if (topic === "RAG Architectures") return `How does ${concept} work, and when would you use it?`;
      return `How would you apply ${concept} to solve a practical programming problem?`;
    });
};

const bank = [];
const seen = new Set();
const counts = [];

for (const { file, mode } of sources) {
  const topic = path.basename(file, path.extname(file));
  const filePath = path.join(dataDir, file);
  const pdf = await pdfParse(await fs.readFile(filePath));
  const qaFormat = topic !== "Programming Languages" &&
    /sample interview questions|technical interview question\s*&\s*model answer bank|question\s+model answer/i.test(pdf.text);
  let questions = qaFormat ? questionMarkQuestions(pdf.text, mode) : [];
  if (!questions.length) questions = conceptsFromNonQa(pdf.text, topic);

  let topicCount = 0;
  for (const question of questions) {
    const normalized = normalize(question);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    bank.push({
      id: `${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${topicCount + 1}`,
      topic,
      mode,
      difficulty: difficultyFor(question, mode),
      category: categoryFor(question, mode),
      question,
    });
    topicCount += 1;
  }
  counts.push({ topic, count: topicCount });
}

await fs.writeFile(outputPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
for (const { topic, count } of counts) console.log(`${topic}: ${count}`);
console.log(`Total: ${bank.length}`);
