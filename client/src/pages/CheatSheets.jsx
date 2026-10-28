import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const sheets = [
  {
    title: "Backend Developer",
    subtitle: "APIs, databases, security, and reliability",
    questions: [
      { question: "How would you design a REST API for creating and retrieving orders?", answer: "Use resource-based routes such as POST /orders and GET /orders/:id. Validate inputs, return suitable status codes, check permissions, and keep errors consistent." },
      { question: "How do database indexes improve performance, and what is the trade-off?", answer: "Indexes help the database find rows faster, especially for common filters and sorts. They use storage and can slow writes because indexes must also be updated." },
      { question: "How would you secure a login and authenticated API?", answer: "Hash passwords with a password hashing algorithm, verify identity with a secure session or token, check authorization on each protected action, validate inputs, and protect secrets." },
      { question: "How would you investigate an API that has become slow?", answer: "Check logs and metrics to find the slow request, inspect database queries and external calls, reproduce the issue, then fix the bottleneck and measure again." },
      { question: "What is the purpose of a message queue in a backend system?", answer: "A queue lets services process work asynchronously. It can smooth traffic spikes, allow retries, and keep slow tasks from delaying the main request." },
      { question: "What is the difference between authentication and authorization?", answer: "Authentication checks who a user is. Authorization checks what that verified user is allowed to do." },
      { question: "How would you test a backend endpoint?", answer: "Test successful and invalid inputs, authentication and permissions, expected status codes and response data, and important failure cases. Use isolated data so tests are repeatable." },
    ],
  },
  {
    title: "Cloud Engineer",
    subtitle: "Cloud architecture, operations, and cost",
    questions: [
      { question: "How would you design a highly available web application in the cloud?", answer: "Run the application across multiple availability zones behind a load balancer, use managed data services with backups, monitor health, and plan recovery from failures." },
      { question: "What is the difference between a public and private subnet?", answer: "A public subnet has a route to an internet gateway. A private subnet has no direct inbound internet route and uses controlled paths for updates or outbound access." },
      { question: "How do you manage cloud access securely?", answer: "Give users and services only the permissions they need, use roles and short-lived credentials, protect secrets, and review access regularly." },
      { question: "How would you reduce an unexpectedly high cloud bill?", answer: "Break down cost by service and usage, identify idle or oversized resources, review storage and data transfer, then apply right-sizing and budgets with alerts." },
      { question: "What is Infrastructure as Code, and why use it?", answer: "Infrastructure as Code defines infrastructure in versioned files. It makes environments repeatable, reviewable, and easier to update consistently." },
      { question: "How would you monitor a production service?", answer: "Track service health, latency, errors, and resource use. Set useful alerts, keep logs and metrics searchable, and connect alerts to clear response steps." },
      { question: "What is the difference between horizontal and vertical scaling?", answer: "Vertical scaling adds resources to one machine. Horizontal scaling adds more machines or instances and often improves capacity and resilience." },
    ],
  },
  {
    title: "MERN Stack Developer",
    subtitle: "MongoDB, Express, React, and Node.js",
    questions: [
      { question: "How does React state differ from props?", answer: "Props are inputs passed into a component. State is data the component owns and updates; changing state causes React to render the affected UI again." },
      { question: "What is Express middleware, and where might you use it?", answer: "Middleware is a function that runs during a request and response cycle. It can handle authentication, validation, logging, or errors before the route sends a response." },
      { question: "When would you embed documents in MongoDB instead of referencing them?", answer: "Embed data that is usually read and updated with its parent and has a suitable size. Reference data that is shared, changes independently, or can grow without bound." },
      { question: "How does data move through a typical MERN feature?", answer: "A React interaction sends an HTTP request to an Express route. Node validates and handles it, reads or writes MongoDB, then returns a response that React displays." },
      { question: "What is the purpose of a React key when rendering a list?", answer: "A key helps React match list items between renders. Stable unique keys help React update the right items when the list changes." },
      { question: "How would you handle errors in an Express application?", answer: "Validate requests near the route, pass unexpected errors to centralized error middleware, log useful context on the server, and return a safe consistent message to the client." },
      { question: "How would you protect a MERN API from invalid input?", answer: "Validate and normalize request data on the server, reject invalid fields with clear status codes, and never rely only on client-side checks." },
    ],
  },
  {
    title: "Frontend Developer",
    subtitle: "Accessible, responsive, maintainable interfaces",
    questions: [
      { question: "What makes HTML semantic, and why does it matter?", answer: "Semantic elements describe their purpose, such as nav, main, and button. They improve accessibility, keyboard and screen reader use, and make page structure clearer." },
      { question: "How would you make a page work well on mobile and desktop?", answer: "Use flexible layouts, responsive CSS, and breakpoints where the content needs them. Test real viewport sizes and keep text, controls, and navigation usable." },
      { question: "What is a JavaScript closure?", answer: "A closure is a function together with access to variables from the scope where it was created, even when that outer function has finished running." },
      { question: "How do you improve the performance of a slow page?", answer: "Measure first, then reduce large assets and unnecessary JavaScript, avoid needless renders, and load non-critical content later. Measure again to confirm the improvement." },
      { question: "How would you make a form accessible?", answer: "Give every input a connected label, explain errors in text, support keyboard use, group related fields, and announce important status changes to assistive technology." },
      { question: "What is event bubbling in JavaScript?", answer: "An event starts at its target and propagates up through ancestor elements. Event delegation uses this behavior to handle events from child elements at a parent." },
      { question: "How do you handle loading and error states in a user interface?", answer: "Show a clear loading state while work is in progress, provide a useful error and recovery action if it fails, and display the result when it succeeds." },
    ],
  },
];

const pickPracticeQuestions = (sheet) => [...sheet.questions]
  .sort(() => Math.random() - 0.5)
  .slice(0, 4);

function CheatSheets() {
  const [activeSheet, setActiveSheet] = useState(0);
  const [visibleAnswers, setVisibleAnswers] = useState({});
  const [practiceQuestions, setPracticeQuestions] = useState(() => pickPracticeQuestions(sheets[0]));
  const navigate = useNavigate();
  const sheet = sheets[activeSheet];

  const selectSheet = (index) => {
    setActiveSheet(index);
    setPracticeQuestions(pickPracticeQuestions(sheets[index]));
    setVisibleAnswers({});
  };

  return (
    <div className="min-h-screen bg-[#f3f3f3] flex flex-col">
      <Navbar />
      <main className="flex-1 px-5 py-10 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <button onClick={() => navigate("/")} className="mb-8 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-700 shadow-sm hover:shadow">
            <FaArrowLeft /> Home
          </button>

          <header className="mb-10 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-green-700">Practice and prepare</p>
            <h1 className="text-3xl font-bold text-gray-900 sm:text-5xl">Interview Cheat Sheets</h1>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">Choose a role, practice the questions, then reveal a concise sample answer.</p>
          </header>

          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sheets.map((item, index) => (
              <button key={item.title} type="button" onClick={() => selectSheet(index)} aria-pressed={activeSheet === index}
                className={`rounded-2xl border p-5 text-left transition ${activeSheet === index ? "border-green-600 bg-green-50 shadow-md" : "border-gray-200 bg-white hover:border-green-300"}`}>
                <span className="block font-semibold text-gray-900">{item.title}</span>
                <span className="mt-2 block text-sm text-gray-500">{item.subtitle}</span>
              </button>
            ))}
          </div>

          <motion.section key={sheet.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{sheet.title} practice questions</h2>
              <p className="mt-2 text-gray-500">Try answering each question before revealing the sample answer.</p>
            </div>
            <div className="space-y-4">
              {practiceQuestions.map((item, index) => {
                const isVisible = Boolean(visibleAnswers[index]);
                return (
                  <article key={item.question} className="rounded-2xl border border-gray-200 p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Practice question {index + 1}</p>
                    <h3 className="mt-2 font-semibold leading-relaxed text-gray-900">{item.question}</h3>
                    <button type="button" onClick={() => setVisibleAnswers((answers) => ({ ...answers, [index]: !answers[index] }))}
                      aria-expanded={isVisible} className="mt-4 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                      {isVisible ? "Hide sample answer" : "Show sample answer"}
                    </button>
                    {isVisible && <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-800">Sample answer</p>
                      <p className="mt-2 text-sm leading-relaxed text-gray-700">{item.answer}</p>
                    </div>}
                  </article>
                );
              })}
            </div>
          </motion.section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default CheatSheets;
