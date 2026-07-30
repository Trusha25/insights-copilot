# Insights Copilot V2 — Next Phase Technical Roadmap

This roadmap picks up exactly where `project_analysis_report.md` leaves off. It's organized so that **architectural fixes come before new features**, because two of your current gaps (no auth, no config abstraction) will make every feature built on top of them more expensive to fix later than to fix now.

---

## Honest Assessment First

Your Advanced MVP is genuinely strong — a real 4-agent pipeline, real external APIs, a working Telegram bot, Mermaid diagram generation, and a diff-based refresh feature are well past "hackathon toy" territory. But three things in the report change how I'd sequence the next phase versus a normal feature list:

1. **There is no user model anywhere in the stack.** `/api/history` returns all workspaces, globally, to anyone who calls it. `WorkspaceList.jsx` and the dashboard have no concept of "whose" data this is. This means "Personalized Dashboards" — one of your core Layer 2 capabilities — doesn't actually exist yet; what exists is a shared public log. This is both a privacy issue and the reason "Saved" and "Settings" are currently dead links: you can't scope saved items or settings to a user who doesn't exist in your data model.
2. **Every real API call is unmetered and unauthenticated.** `/api/analyze` triggers real Groq, Tavily, GitHub, arXiv, and Semantic Scholar calls with no rate limiting and no caching beyond the refresh-diff feature. Without auth, there's no way to even attribute or throttle abuse — one bad actor hitting `/api/analyze` in a loop can burn your entire Tavily/Groq free-tier budget in minutes.
3. **The report's own recommendation #5 (SQLite fallback) is the wrong fix for the actual problem.** The real issue isn't "no offline dev mode" — it's that `DummySupabase` silently swallows writes when env vars are missing, so a misconfigured deployment *looks* like it's working while quietly losing every user's data. Adding a second persistence backend (SQLite) roughly doubles your database code surface (two schemas, two client codepaths, two sets of migration logic) to solve a problem that a five-line startup check solves better: **fail loudly if Supabase isn't configured**, don't fail silently into data loss. I'd drop the SQLite-fallback recommendation entirely — for local dev without cloud config, `docker-compose` running a local Postgres image gives you real Supabase-compatible behavior for less code than a second ORM path.

Everything below is sequenced around fixing 1 and 2 first, since almost every "next feature" you'd want (Settings, Saved, personalized reminders, per-user model config) depends on a user existing in your system at all.

---

## Architectural Changes Required Before New Features

### A1. Authentication & Multi-Tenant Data Model — *do this first, before anything else*

**Purpose:** give the system a concept of "a user," which is the prerequisite for Personalized Dashboards, Settings, Saved, and safe Telegram linking (right now, nothing stops any Telegram user from linking to any workspace ID).

**Backend logic:** add Supabase Auth (email magic-link is fastest to wire up; GitHub OAuth is a nice fit given your dev audience). Every FastAPI endpoint that touches workspace data needs a dependency that verifies the Supabase JWT from the `Authorization` header and extracts `user_id`. `agents.py`'s pipeline doesn't need to change — it stays agnostic to who called it — but `main.py`'s route handlers do, and `db.py`'s query functions need a `user_id` filter added to every read/write.

**Database updates:** add a `user_id UUID REFERENCES auth.users` column to your `workspaces` table (and any child tables referencing it) in `supabase_schema.sql`. Then enable Row-Level Security with a policy of `user_id = auth.uid()` on every table holding workspace data. This is the actual fix for the privacy gap named above — RLS enforces the scoping at the database layer, so even a bug in your FastAPI route logic can't leak another user's data.

**Frontend changes:** add a login screen (Supabase's JS client handles the magic-link flow in a few lines), store the session token, and attach it as a Bearer token in every `api.js` request. `App.jsx`'s state controller needs a top-level "logged in / not logged in" branch.

**API requirements:** every existing endpoint (`/api/analyze`, `/api/history`, `/api/history/{id}`, `/api/mentor`, `/api/workspaces/{id}/refresh`, `/api/workspaces/{id}/telegram-link`) needs the auth dependency added and needs to filter by the authenticated `user_id`, not just the route's `{id}` parameter — right now, any client that knows a workspace ID can hit `/api/history/{id}` for a workspace that isn't theirs.

**Challenges & edge cases:** existing rows in Supabase predate this column and will need a backfill or a migration decision (assign to a default/admin user, or archive them). Decide before writing the migration, not during it. Also: your `/api/workspaces/{id}/telegram-link` endpoint needs to verify the requesting user owns that workspace before generating a deep link, or you've just built an authorization bypass into the one feature meant to connect identity across systems.

**Best practice:** don't handroll JWT verification — use Supabase's own verification helper or a well-maintained JWT library, and test RLS by logging in as two different test accounts and confirming neither can read the other's `/api/history`, before you consider this phase done.

### A2. Configuration & Environment Cleanup — *do alongside A1, it's cheap*

**Purpose:** fixes report items #1 (README), #6 (hardcoded backend URL), and the silent-fallback problem in #5, all of which are low-effort and currently create real deployment risk.

**Backend logic:** in `db.py`, replace the `DummySupabase` silent fallback with a startup check that raises a clear error (`RuntimeError("SUPABASE_URL/SUPABASE_KEY not set")`) if the environment isn't configured — fail at boot, not silently at write-time.

**Frontend changes:** in `api.js`, replace the hardcoded `https://insights-copilot-s35d.onrender.com` with `import.meta.env.VITE_API_BASE_URL`, set via Vite's `.env` files, so the same frontend build works against local, staging, or production backends without a code edit.

**Deliverable:** rewritten `README.md` reflecting the actual Supabase-only setup, with the `supabase_schema.sql` migration instructions the report already flagged as missing, plus a new `.env.example` in both `frontend/` and `backend/` so a new contributor knows every required variable without reading source code.

**Best practice:** this whole phase is a half-day of work with near-zero risk — do it before A1's migration work so your local testing of the auth changes isn't fighting a hardcoded production URL at the same time.

### A3. Caching & Rate Limiting Layer — *do right after auth lands*

**Purpose:** protects your free-tier API budgets (Groq, Tavily, GitHub, arXiv, Semantic Scholar) now that you have a `user_id` to key limits against.

**Backend logic:** add a simple per-user rate limit on `/api/analyze` (e.g., `slowapi`, which integrates cleanly with FastAPI) — a generous limit is fine, the point is stopping unbounded loops, not restricting normal use. Separately, cache identical-idea search results for a short TTL (even an in-memory dict or a Redis free-tier instance) so a user re-submitting the same idea text doesn't re-trigger five external API calls.

**Database updates:** none required if you use in-process caching; if you want cache persistence across backend restarts, a `search_cache` table keyed by query hash is a lightweight option.

**Challenges:** the existing Refresh/diff feature (`/api/workspaces/{id}/refresh`) is *supposed* to re-query and find new sources — make sure your caching layer doesn't accidentally suppress that endpoint's intended re-fetch behavior. Scope your cache key to the analyze/decompose queries, not the refresh endpoint.

---

## Prioritized Feature Roadmap

| Order | Feature | Depends on | Why this position |
|---|---|---|---|
| 1 | A1 — Auth & multi-tenant data model | — | Everything else (Settings, Saved, safe Telegram linking) is blocked on this; also closes the current privacy gap |
| 2 | A2 — Config/env cleanup + debt burndown | — | Independent of auth, cheap, reduces risk while you're already touching `db.py` and `api.js` |
| 3 | A3 — Caching & rate limiting | A1 | Needs `user_id` to be meaningful; protects budget before you drive more traffic with new features |
| 4 | Telegram Frontend Gateway | A1 | Bot logic already exists — this is now mostly a "add a button" task, but must check workspace ownership per A1 |
| 5 | Settings Panel | A1 | Needs a user row to attach preferences to |
| 6 | Saved / Favorites View | A1 | Needs a user row to attach favorites to; also finally removes the dead sidebar link |
| 7 | Model redundancy (Gemini fallback alongside Groq) | — | Independent, but lower urgency than user-facing gaps; do once core UX is solid |
| 8 | Observability & monitoring | A3 | More valuable once real traffic exists behind rate limits worth watching |
| 9 | Automated test suite | A1, A2 | Write tests against the *new* auth-aware endpoints, not the soon-to-change old ones |
| 10 | Multilingual support | — | Postponed — translate rendered output only, not the pipeline, when you get to it |
| 11 | Knowledge clustering | — | Postponed — highest effort, least urgent, still no clear owner-feature in your current UI for it |

---

## Detailed Feature Breakdowns

### Telegram Frontend Gateway (report item: Missing)

**Purpose:** close the loop the report identified — the bot and its endpoint already work, the frontend just doesn't expose it.

**User flow:** user views a workspace on the dashboard → clicks a "Connect Telegram" button (best placed in `PlanCard.jsx`, since milestone tracking is what the bot is for) → frontend calls `GET /api/workspaces/{id}/telegram-link` → opens the returned `t.me` deep link in a new tab → user's Telegram `/start` command (already implemented in `start.py`) links their chat ID to the workspace.

**Backend logic:** no new logic needed beyond the ownership check from A1 — the endpoint already exists and works.

**Frontend changes:** one new button component, wired to the existing endpoint in `api.js`. This is genuinely one of the cheapest features on this list relative to value delivered — prioritize it right after A1 lands specifically because it's nearly free.

**Edge cases:** what happens if a user clicks "Connect Telegram" twice, or links a second workspace to a chat ID already linked to a different workspace? Decide the intended behavior (allow multiple linked workspaces per chat, with `/status` showing a picker, or restrict to one active workspace per chat) before building the button — this is a product decision your `handlers/` code needs to reflect, not just a UI afterthought.

### Settings Panel (report item: Missing, "Add Settings Panel")

**Purpose:** let users configure preferences instead of hardcoded backend defaults — theme, and optionally bring-your-own API keys for Groq/Tavily if you want to let power users avoid your shared quota.

**User flow:** user clicks "Settings" in `Sidebar.jsx` (currently dead) → sees a form for theme toggle and optional personal API key fields → saves → preferences persist across sessions.

**Backend logic:** a new `/api/settings` GET/PUT pair, reading/writing a `user_settings` table keyed by `user_id`. If you support BYO API keys, **never** store them in plaintext — use Supabase's encryption-at-rest for the column at minimum, and consider whether this feature is worth the security surface it adds before committing to it; a simpler v1 is theme-only settings, with BYO keys as a clearly separate, later addition.

**Database updates:** new `user_settings` table: `user_id`, `theme`, `preferred_model` (nullable), `api_keys` (nullable, encrypted).

**Frontend changes:** new `SettingsView.jsx` component, replacing the dead sidebar route; theme toggle needs to actually apply to Tailwind's theme config, which — worth noting — currently doesn't have a dark variant built out, since the report describes the dashboard as light-themed with `WorkspaceList.jsx`'s dark styling explicitly called out as conflicting and unused. A real theme toggle is more work than it looks like from the sidebar alone.

**Best practice:** ship theme-only settings first; treat BYO-API-keys as its own scoped feature with its own security review, not a checkbox item bundled into the same PR.

### Saved / Favorites View (report item: Missing)

**Purpose:** distinguish "everything I've ever analyzed" (History) from "things I actually care about" (Saved) — currently the sidebar implies this distinction exists but it's a dead link.

**User flow:** user clicks a star/save icon on a workspace (in `HistoryView.jsx` or the main dashboard) → workspace gets flagged → "Saved" sidebar tab shows only flagged workspaces.

**Backend logic:** add an `is_saved BOOLEAN DEFAULT FALSE` column to `workspaces`, and a `PATCH /api/workspaces/{id}/save` endpoint (toggle), with the same ownership check pattern as everything else post-A1.

**Frontend changes:** a save-toggle icon component, reused across `HistoryView.jsx` and the dashboard cards, plus a new filtered view for the Saved sidebar tab — likely `HistoryView.jsx` with a filter prop rather than a whole new component, since the UI shape is identical.

**Edge cases:** decide whether "Saved" is a boolean flag or a many-to-many tagging system (folders/labels) — a flag is enough for v1 and is a five-minute schema change versus a genuinely bigger feature if you want folders later.

### Model Redundancy — Gemini Fallback Alongside Groq

**Purpose:** right now your entire AI pipeline has a single point of failure — if Groq is rate-limited, degraded, or down, every agent call fails. Given your pipeline is already structured as four separate agent calls (Research → Planner → Critic → Mentor) in `agents.py`, adding a fallback provider is a targeted change, not a rewrite.

**Backend logic:** wrap your existing Groq client calls in `agents.py` with a try/except that falls back to Gemini's free tier (1,500 requests/day, no card) on rate-limit or timeout errors specifically — not on all errors, since you don't want to silently mask a genuine prompt/schema bug by retrying it on a different model. Log which provider actually served each request so you can monitor fallback frequency.

**Challenges:** your Mermaid-diagram generation and JSON-structured outputs (Planner, Critic) are almost certainly tuned against Groq/Llama's specific output tendencies — test that Gemini produces equally valid Mermaid syntax and equally schema-conformant JSON before trusting it as a silent fallback in production, since a differently-formatted-but-technically-valid response from a second model is a realistic edge case that's easy to miss in casual testing.

### Observability & Monitoring

**Purpose:** you currently have no visibility into agent failure rates, external API error rates, or per-user usage — all of which matter more once A3's rate limiting is live and once real users depend on the Telegram reminders actually firing.

**Backend logic:** add structured logging around each agent call in `agents.py` (which agent, success/failure, latency, which provider served it if A7 is done), plus a free-tier Sentry integration for exception tracking across both the FastAPI app and the Telegram bot's background thread — the bot runs on a daemon thread per your `main.py` setup, and daemon-thread exceptions are notoriously easy to lose silently if they're not explicitly captured.

**Best practice:** specifically monitor APScheduler job failures in `scheduler.py` — a silently-failing reminder job is worse than no reminder feature at all, since users will trust it's working until they notice it isn't.

### Automated Test Suite

**Purpose:** you're about to touch `db.py`, every route in `main.py`, and the auth layer simultaneously — this is exactly the point where regressions are most likely and least visible without tests.

**Backend logic:** prioritize tests in this order: (1) RLS policy tests — log in as two test users, assert neither can read the other's data, this is your highest-risk area; (2) schema-validation tests for agent outputs — feed known-bad LLM output through your Planner/Critic parsing and confirm it fails safely rather than corrupting a workspace record; (3) endpoint auth tests — confirm every route rejects unauthenticated requests.

**Best practice:** write these against the *post-A1* endpoints — don't spend time testing the current unauthenticated versions of these routes, since that behavior is being replaced.

---

## MVP for This Phase vs. Postponed

**Build now (this phase's MVP):** A1 (auth/multi-tenancy), A2 (config cleanup), A3 (caching/rate limiting), Telegram Frontend Gateway, and Saved view. These close the privacy gap, the cost-risk gap, and the two dead-link items from the report with the least new surface area.

**Postpone to the phase after:** Settings panel beyond a basic theme toggle (BYO API keys specifically deserve their own security-focused pass), model redundancy (valuable but not urgent — Groq's free tier has been reliable enough that this is risk mitigation, not a current fire), observability tooling (more valuable once A3's rate limits are live and there's real usage to observe), and the automated test suite's full coverage (write the RLS tests now, as part of A1 itself, but treat comprehensive coverage as ongoing work rather than a gate).

**Postpone further out:** multilingual support and knowledge clustering — both were already lower-priority Layer 2 capabilities in the original scoping, and neither has any partial implementation to build on yet, so they're greenfield work that shouldn't compete with closing the auth/privacy gap for engineering time.

---

## Summary of Gaps to Address Before Wider Use

In order of actual urgency, not the order they appear in the report: **(1)** no auth means no real data privacy — fix before any public/wider rollout, not just before new features; **(2)** no rate limiting means unbounded cost exposure on real paid-adjacent free-tier APIs; **(3)** the silent `DummySupabase` fallback means a misconfigured deployment can look healthy while losing all data — replace with a loud startup failure; **(4)** hardcoded frontend backend URL blocks any deployment other than your current Render instance; **(5)** the two dead sidebar links are a polish issue, not a risk, and can wait until their real prerequisite (auth) is done rather than being patched with placeholder pages now.
