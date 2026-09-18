# StudyFlowAI — AI Study Companion

An AI-powered learning workspace: upload study material (PDF), learn with a
grounded AI Tutor that cites page-level sources, take adaptive quizzes
(MCQ + AI-graded open answers), and watch concept mastery, growth analysis
and recommendations update from real evidence. Includes an admin dashboard
with full AI-usage observability.

Built with **MongoDB · Express · React · Node (MERN)** and **Google Gemini**.

```
Space → Project → Upload PDF → Background processing (parse → chunk → embed)
      → AI Tutor (grounded answers + citations, honest refusals)
      → Adaptive Quiz (weakest concepts first) → Mastery → Growth → Recommendation
```

---

## 1. Setup instructions

**Prerequisites**

- Node.js 20+ and npm
- A MongoDB database (local `mongodb://localhost:27017` or a free
  [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)
- A Gemini API key (free) from [aistudio.google.com](https://aistudio.google.com) → *Get API key*

**Install**

```bash
git clone https://github.com/<your-username>/studyflowai.git
cd studyflowai

# backend
cd backend
npm install

# frontend (second terminal, or after the backend is installed)
cd ../frontend
npm install
```

## 2. Configuration examples

The backend reads all configuration from environment variables
(`backend/src/config/env.js` — fails fast if something required is missing).

**`backend/.env`** (copy from `backend/.env.example`, fill in real values — never committed):

```bash
# --- required ---
MONGODB_URI=mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/studyflow?retryWrites=true&w=majority
JWT_SECRET=change-me-to-a-long-random-string

# --- AI (free tier) ---
GEMINI_API_KEY=AIza...your-key
GEMINI_TEXT_MODEL=gemini-3.6-flash          # optional override, this is the default
GEMINI_EMBEDDING_MODEL=gemini-embedding-001 # optional override, this is the default

# --- optional (sane defaults shown) ---
JWT_EXPIRES_IN=7d
TUTOR_MIN_SIMILARITY=0.3      # tutor refuses below this similarity (no LLM call)
ADMIN_EMAIL=you@example.com   # this email registers with the admin role
CORS_ORIGINS=http://localhost:5173
JOB_RETRY_DELAY_MS=30000      # background-job retry backoff
# PORT=4000                   # Render injects its own
```

**`frontend/.env`** (only needed for production builds — dev uses the Vite proxy):

```bash
# Base URL of the deployed API, no trailing slash. Leave empty in local dev.
VITE_API_URL=
```

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 3. Run locally

```bash
# terminal 1 — API on http://localhost:4000
cd backend
npm run dev

# terminal 2 — web app on http://localhost:5173
cd frontend
npm run dev
```

Then:

1. Open `http://localhost:5173` and register.
   The email in `ADMIN_EMAIL` becomes the **admin** account.
2. Create a Space → a Project (with a learning goal) → upload a PDF.
   The material flips `queued → processing → ready` (background worker).
3. Ask the Tutor a question about the PDF → grounded answer with citations.
   Ask something unrelated → it refuses (no evidence, no hallucination).
4. Start a quiz, answer an MCQ and an open question, finish → mastery bars
   and a recommendation update.

Health check: `GET http://localhost:4000/api/health`

## 4. Test instructions

```bash
cd backend
npm test
```

**15 tests / 6 suites**, and the suite runs **fully offline** — an in-memory
MongoDB replaces Atlas and the AI is stubbed through dependency seams, so no
API key, no quota and no network are needed.

Covered: auth (validation, duplicates, generic login errors) · cross-user
project isolation (stranger → 404) · text chunking (overlap, page numbers) ·
retrieval scoring · the full upload → process pipeline against a real 2-page
PDF fixture · the adaptive quiz loop (exact mastery blend math, double-answer
rejection, no answer leakage before submission).

## 5. Deployment

Free-tier stack: **Render** (API) + **Vercel** (frontend) + **MongoDB Atlas** (M0).

1. **Atlas** — create a free cluster, get the connection string, allow
   access from Render (network access `0.0.0.0/0` on the free tier).
2. **Render** — *New → Web Service*, root directory `backend/`:
   - Build: `npm install` · Start: `npm start` · Health check: `/api/health`
   - Environment variables:

     ```
     MONGODB_URI=mongodb+srv://...
     JWT_SECRET=<long random string>
     GEMINI_API_KEY=<your key>
     ADMIN_EMAIL=you@example.com
     CORS_ORIGINS=https://<your-app>.vercel.app
     ```
3. **Vercel** — import the repo, root directory `frontend/` (Vite is
   auto-detected; build `npm run build`, output `dist`):
   - Environment variable: `VITE_API_URL=https://<your-render-app>.onrender.com`
     (applied at build time — redeploy after changing it)
   - `frontend/vercel.json` rewrites all routes to `index.html`, so React
     Router deep links survive a page refresh
4. **Close the CORS loop** — make sure `CORS_ORIGINS` on Render contains the
   exact Vercel URL.

Notes: the free Render tier sleeps after ~15 min idle (first request
cold-starts in ~50 s — hit `/api/health` first). Secrets live only in the
platform dashboards, never in the repo.

## Project structure

```
backend/
  src/
    ai/gemini.js          # the ONLY module that talks to Gemini (tracked, retried, schema-validated)
    config/env.js         # env parsing, fails fast
    controllers/          # HTTP shape, validation, ownership
    middleware/           # auth, admin, central error handler
    models/               # 13 Mongoose collections
    routes/               # URL wiring + auth gates
    services/             # tutor, quiz, retrieval (business logic)
    workers/              # background PDF pipeline (atomic job claim, retries)
    tests/                # offline test suite (node --test)
frontend/
  src/
    api/                  # fetch wrapper
    components/ pages/    # React SPA (spaces, project workspace tabs, admin)
docs/                     # architecture, AI usage, prompts, demo script
```

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — system design, data model,
  request flows, decisions and trade-offs (+ PDF version)
- [`docs/ai-usage.md`](docs/ai-usage.md) — AI used to build vs AI used by the
  product, evaluation approach (+ PDF version)
- [`docs/prompts/development-prompts.md`](docs/prompts/development-prompts.md)
  — AI prompts used during development (+ PDF selection)
- [`docs/demo-script.md`](docs/demo-script.md) — demo video shot list

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Missing required environment variable` on boot | `.env` missing or renamed — copy from `.env.example` |
| Changed `.env`, nothing happened | restart `npm run dev` (nodemon doesn't watch `.env`) |
| Browser shows CORS error in production | `CORS_ORIGINS` on Render must list the exact Vercel URL |
| First request after idle takes ~50 s | Render free tier cold start — expected |
| `AI service is busy right now` | provider overload; the API already retried with backoff |

## Known limitations

- Background worker runs inside the API process (fine for a prototype; a real
  deployment would extract it or use a managed queue)
- Retrieval is in-process cosine similarity — would move to Atlas Vector
  Search beyond a few thousand chunks
- PDFs need a text layer; scanned PDFs are rejected with a clear error (OCR
  is future work)
- Free-tier Gemini quotas (20 generations/day/model) with occasional
  overload windows — handled with backoff and friendly errors, not eliminated
