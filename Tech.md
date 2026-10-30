# InterviewAgent — Technology Stack

InterviewAgent is a full-stack web application for practicing AI-assisted interviews, managing resumes, and reviewing interview performance.

## Frontend

- **React 19** builds the single-page user interface.
- **Vite 7** provides the development server and production build.
- **React Router 7** handles client-side pages and navigation.
- **Redux Toolkit** and **React Redux** manage shared user state.
- **Tailwind CSS 4** provides utility-based styling, integrated through the Vite plugin.
- **Motion** adds interface animations.
- **Axios** sends requests to the backend API.
- **Firebase Authentication** provides Google sign-in.
- **Recharts** renders dashboard and interview performance charts.
- **jsPDF** and **jspdf-autotable** generate downloadable interview reports.
- **React Icons** supplies interface icons; **react-circular-progressbar** displays circular progress indicators.

## Backend

- **Node.js** runs the API server using JavaScript ES modules.
- **Express 5** defines REST API routes and middleware.
- **MongoDB** stores application data; **Mongoose** defines models and connects to the database.
- **JSON Web Tokens (JWT)** provide backend sessions in HTTP-only cookies.
- **cookie-parser** reads session cookies, and **CORS** allows credentialed requests from the frontend.
- **Multer** handles uploaded resume files.
- **PDF.js (`pdfjs-dist`)** extracts text from resumes; **pdf-parse** is used by the question-bank script.
- **OpenRouter** provides the language-model API used for AI interview features. The model is selected with `OPENROUTER_MODEL` and defaults to `openai/gpt-4o-mini`.
- **dotenv** loads local environment configuration.

## Data and application features

MongoDB models store users, resumes, interviews, questions, responses, coaching results, gamification data, role information, company tracks, and leaderboard entries. The application includes interview setup and practice, resume analysis, interview history, performance reports, dashboards, and leaderboard views.

## Hosting and configuration

- **Netlify** hosts the frontend. `client/public/_redirects` supports client-side route fallback, and the root `netlify.toml` configures the build and secret-scan exclusions for public frontend configuration values.
- **Render** hosts the backend API.
- The frontend reads `VITE_SERVER_URL` and `VITE_FIREBASE_APIKEY` from its build environment.
- The backend uses environment variables such as `PORT`, `MONGODB_URL`, `JWT_SECRET`, `OPENROUTER_API_KEY`, and optionally `OPENROUTER_MODEL`.

## Development commands

Run commands from the relevant project directory:

```bash
# Frontend (client)
npm run dev
npm run build
npm run lint

# Backend (server)
npm run dev
npm start
```
