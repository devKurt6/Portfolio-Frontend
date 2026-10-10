# Portfolio frontend — standalone repository

Upload **this folder’s contents** to the frontend GitHub repository. `package.json` and `netlify.toml` must be at its root. This includes the existing Groq Netlify function; the Python backend belongs in its separate repository.

## Local setup

From this folder, on Windows/macOS/Linux:

```sh
pnpm install
pnpm build
pnpm dev
```

Open `http://127.0.0.1:4173`. Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`; macOS/Linux: `cp .env.example .env`). For local live projects/wall, set:

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

Keep existing private `GROQ_API_KEY` and optional `SYSTEM_PROMPT` in Netlify’s function environment. Never expose backend `ADMIN_TOKEN` or `IP_HASH_SALT` here. Only the four public build values above reach the browser. Backend CORS must permit `https://kurt-profile.netlify.app`. Projects/wall use Render, contact remains Netlify Forms, and chat remains Groq.

## Checks

```sh
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

Optional Playwright QA scripts in `tools/` require a QA runtime; `backend-browser-test.cjs` requires both local servers and safely stubs the legacy contact/chat services. No new frontend dependency was added for separating repositories. TypeScript remains the existing development checker.

`.gitignore` excludes `.env`, `node_modules`, `dist`, and `.qa`. If uploading through GitHub’s browser, omit those manually. Include `.env.example` and all source/config/content files.

The backend is independently seeded from its own `app/content/` snapshots. When editing frontend `data/projects.json` or `portfolio/about.txt`, update the separate backend snapshots deliberately. Existing database project rows are not overwritten by seeding. No sibling-folder filesystem access is required by either app.
