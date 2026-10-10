# Portfolio redesign

The site remains plain HTML, CSS, and JavaScript, deployed from GitHub to Netlify. The generated HTML is committed with the source, so the existing deployment configuration needs no changes. No runtime package was added. TypeScript is a development-only checker for JSDoc and shared interfaces.

## Local workflow

Use Node.js 22 or newer with npm or pnpm. Install development dependencies once, then run:

```sh
npm install
npm run build
npm run lint
npm run typecheck
npm test
npm run dev
```

With pnpm, use `pnpm install --frozen-lockfile` and the same script names. The preview is at `http://127.0.0.1:4173`. The local preview server does not emulate Netlify Forms or Groq functions; it returns an error for real submissions. Browser QA intercepts these requests instead of contacting production services.

After editing content or templates, run the build and include its generated HTML in your commit. Do not change Netlify's publish folder to a new `dist` directory: this redesign continues using the existing repository layout.

## Content and architecture

- `data/projects.json`: all seven original projects, descriptions, screenshots, technology labels, YouTube IDs, available live links, and supplemental descriptions from the original assistant data. GitHub fields are empty where no verified project repository was provided.
- `data/content.json`: original introduction, role, social links, code sample, employer timeline, certificate gallery, contact forms, and submission-result copy. These are preserved source fragments used by the static generator.
- `portfolio/`: original assistant knowledge files and downloadable résumé, preserved at their original URLs.
- `tools/build.mjs`: static HTML generator, About education/achievements, and composed page layouts.
- `components/layout/`, `components/ui/`, `components/projects/`: reusable shell, controls, media dialogs, and card rendering.
- `pages/`: route-specific JavaScript loaded with native `import()`.
- `components/visual/`, `components/freedom-wall/`, `components/chatbot/`: lazy-loaded technical visual, mock wall, and real assistant interface.
- `hooks/`, `lib/`, `types/`: reusable state controllers, utilities/validation, safe Markdown rendering, and shared interfaces.
- `services/api.mjs`: the single browser data/service interface.

Home, Projects, About, Contact, and seven project detail pages render their real content into HTML at build time. There is no client-side content-fetch prerequisite for SEO or reading the pages. Each page imports its own interaction module. The wall mounts near the viewport; the assistant panel and existing Marked formatter load on first opening. The canvas pauses outside the viewport and when the tab is hidden, and renders a static frame for reduced motion.

Legacy `index.html#projects`, `#about`, `#contact`, and prototype-style hash routes resolve to the new static routes. Existing `success.html`, `error.html`, `type.html`, résumé, image, and video URLs remain available. The original `script.js` and alternate chat clients remain in the repo but are no longer loaded by the redesigned pages. Local originals are also retained in `.redesign-backup/`, which is ignored.

The reference folder is untouched and ignored by Git. It therefore stays out of new GitHub commits and the resulting Git-integrated Netlify deployment. `.qa/`, backups, and `node_modules/` are also ignored. Existing `netlify.toml`, function implementations, secrets, and environment configuration are unchanged.

## Services and a future FastAPI backend

Contact still posts URL-encoded data to `/` with `form-name=contact-main` and a honeypot. Static Netlify registration remains in the generated Contact page; the original dormant `contact` popup registration and reCAPTCHA markup remain in Home. The main form supports native submission to `/success.html` without JavaScript, or inline validation/sending/success/retry when JavaScript is available.

Chat still posts to `/.netlify/functions/chat-groq` with `question`, `session_id`, `username`, and `history`. It retains the 20-message history limit and short-response typewriter behavior, with safe Markdown and reduced-motion support. Existing Groq function and environment variable names are unchanged.

The Freedom Wall starts empty, with no sample notes. Submitted notes, likes, reports, cooldown, and author-only pending notes are local to the browser tab's session storage (`kurt-wall-demo-v2`), with an in-memory fallback. The previous `v1` comments are cleared when the wall service loads. It is not a public message board or a real moderation service. The UI provides loading, empty, error/retry, sort, six-note pagination, emoji, profanity/length validation, honeypot, 15-second cooldown, and like rollback. User text is inserted using DOM text nodes, never HTML.

To switch to FastAPI, replace adapters in `services/api.mjs`, keeping these shapes from `types/index.d.ts`:

| Adapter | Future endpoint |
|---|---|
| `getProjects()` | `GET /api/projects` |
| `getProject(slug)` | `GET /api/projects/{slug}` |
| `getWallMessages({sort, offset, limit})` | `GET /api/freedom-wall/messages` |
| `postWallMessage(payload)` | `POST /api/freedom-wall/messages` |
| `likeWallMessage(id)` | `POST /api/freedom-wall/messages/{id}/like` |
| `reportWallMessage(id)` | `POST /api/freedom-wall/messages/{id}/report` |
| `sendContact(payload)` | `POST /api/contact` |
| `sendChat(payload)` | `POST /api/chat` |

The wall list returns `{items, total, nextOffset}`. Posting and liking return a `WallMessage`. The chat adapter resolves to response text. Keep static project pages generated from local content unless a future migration explicitly changes their build-time source; changing the runtime adapter alone does not rewrite static HTML.

A real wall backend must enforce moderation, link approval, author visibility, rate limits, and like/report identity on the server. Client validation and session-local mock state are only frontend preparation. Keep the existing real contact/chat adapters until a replacement backend is actually available.

## Verification

`npm run lint` checks JavaScript syntax, placeholders, duplicate IDs, local assets/routes, favicon presence, and all seven projects. `npm run typecheck` checks the browser modules and shared contracts. `npm test` covers wall pagination, cooldown, link approval, likes/reports, validation, and the original real-service request contracts using mocked responses.

`tools/browser-test.cjs` is an additional QA harness. It uses Playwright from a QA environment; Playwright is not a runtime or project dependency. It checks 14 URLs at 375, 768, and 1280 pixels in dark/light mode, image loading, overflow, theme persistence, legacy URLs, filters, media keyboard behavior, wall safety/error recovery, assistant focus/formatting, and contact states. Screenshots are saved under ignored `.qa/`.

Production Groq availability and actual Netlify form delivery still require a smoke test after your deployment; no real form submissions or production chat calls were made during local testing.

No commits or pushes were made. The work is on `codex/prototype-ui` for your review and commit.

## File changes

Updated: `index.html`, `style.css`, `success.html`, `error.html`, and `type.html`.

Added: generated `about/index.html`, `contact/index.html`, `projects/index.html`, seven `projects/<slug>/index.html` detail pages; `app.mjs`; the component/controller/service/utility/type folders listed above; `data/content.json` and `data/projects.json`; development scripts in `tools/`; `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `.gitignore`, and this guide.

No original source files, assets, résumé, project data, alternate chat clients, or function files were deleted. The reference prototype was neither modified nor added to Git.
