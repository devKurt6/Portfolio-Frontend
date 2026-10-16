# Portfolio frontend — standalone repository

Upload **this folder’s contents** to the frontend GitHub repository. `package.json` and `netlify.toml` must be at its root. This includes the existing Groq Netlify function; the Python backend belongs in its separate repository.

## Local setup

From this folder, on Windows/macOS/Linux:

```sh
pnpm install
pnpm build
pnpm dev
```

Open `http://127.0.0.1:4173`. Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`; macOS/Linux: `cp .env.example .env`). For the local live wall, set:

```dotenv
PORTFOLIO_API_MODE=live
PORTFOLIO_API_BASE_URL=http://127.0.0.1:8000
PORTFOLIO_CONTACT_MODE=legacy
PORTFOLIO_CHAT_MODE=legacy
```

Run the separate backend on port 8000. Rebuild whenever environment values change. `PORTFOLIO_API_MODE=mock` simulates wall/contact/chat without external submissions; mock wall data stays in browser session storage and mock contact sends nothing.

Local static preview cannot execute Netlify Forms/Groq. Use Netlify’s function-enabled local environment for these services, or temporarily set both selective modes to `backend` to exercise the backend’s local contact/chat endpoints.

## Netlify deployment

Connect **this frontend repository**. Base directory: **blank**. Build command: `node tools/build.mjs && node tools/publish.mjs`. Publish directory: `dist`. Functions directory: `netlify/functions`. These values already exist in `netlify.toml`; all routes have real HTML files, so no blanket SPA redirect is needed.

Set Netlify build variables:

| Variable | Value |
| --- | --- |
| `PORTFOLIO_API_MODE` | `live` |
| `PORTFOLIO_API_BASE_URL` | Your Render HTTPS service URL, without `/api` |
| `PORTFOLIO_CONTACT_MODE` | `legacy` |
| `PORTFOLIO_CHAT_MODE` | `legacy` |

Keep existing private `GROQ_API_KEY` and optional `SYSTEM_PROMPT` in Netlify’s function environment. Never expose backend `ADMIN_TOKEN` or `IP_HASH_SALT` here. Only the four public build values above reach the browser. Backend CORS must permit `https://kurt-profile.netlify.app`. Projects are generated from `data/projects.json`; the wall uses Render, contact remains Netlify Forms, and chat remains Groq.

## Checks

```sh
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

Optional Playwright QA scripts in `tools/` require a QA runtime; `backend-browser-test.cjs` requires both local servers and safely stubs the legacy contact/chat services. No new frontend dependency was added for separating repositories. TypeScript remains the existing development checker.

`.gitignore` excludes `.env`, `node_modules`, `dist`, and `.qa`. If uploading through GitHub’s browser, omit those manually. Include `.env.example` and all source/config/content files.

Projects have one display source: frontend `data/projects.json`. Edit that file, add images under `images/`, and rebuild/redeploy the frontend. The build generates cards, filters, and `/projects/<slug>/` pages. Live mode does not replace projects with database content. Backend project snapshots/endpoints are retained for compatibility but are no longer used by the portfolio display; no backend project update is needed. Backend chat profile snapshots remain separate from displayed project content. Existing database records and Freedom Wall data are preserved.


## Startup screen

In live mode, the introduction runs once per tab session for 2.5 seconds including the opening transition. Five messages appear gradually, ending with Ready. The backend health probe starts immediately in the background and never delays opening the portfolio. Mock mode skips the introduction.

The Freedom Wall shares the background health probe and displays a waiting notice while connecting. Posting is disabled until the initial wall load succeeds; notes load automatically when the server is ready. Health probes retry for up to 90 seconds. If the connection fails, the wall offers Retry while visitors can continue browsing static pages. Reduced-motion preferences and keyboard focus are respected. Deploy only the frontend for this change.
