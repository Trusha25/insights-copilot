# Implementation Plan: Insights Copilot V2

This document provides a comprehensive, step-by-step technical blueprint for the Phase 2 development of **Insights Copilot**. It is designed to be followed sequentially, addressing critical architectural debt first (Authentication, Config abstraction, Rate limiting) before adding user-facing features (Telegram Gateway, Saved View, Settings) and system reliability (Model redundancy, Observability, Tests).

---

## Refactoring to Complete BEFORE Implementing New Features

Before adding new capabilities, the following refactoring tasks are required to stabilize the codebase:
1. **Decouple FastAPI Lifespan and Bot Threading:** Clean up the startup sequence in [main.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/main.py) to handle termination signals gracefully, ensuring the background Telegram bot thread is cleanly disposed of.
2. **Standardize Async Clients:** Ensure external API helper functions in [agents.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/agents.py) use a shared, reusable `httpx.AsyncClient()` instance (e.g., using lifespan state) rather than instantiating a new client context manager for every single fetch request.
3. **Consolidate Theme Management:** Remove conflicting unused styling files or utility classes to prepare the Tailwind system for a clean dark mode implementation.

---

## Phase 1: Architectural Foundation & Configuration

This phase establishes multi-tenancy, resolves cost-risk vulnerabilities, and secures data isolation.

### Step 1: Config & Environment Cleanup (A2)
* **What needs to be built:**
  * Clean environment management in the frontend and backend, avoiding hardcoded URLs.
  * A loud startup failure check replacing the silent fallback of `DummySupabase`.
  * Comprehensive documentation for project setup.
* **Why it is required:** 
  * Prevents silent data loss when Supabase credentials are misconfigured.
  * Stops frontend requests from calling hardcoded external endpoints (Render) during local development.
* **How it should be implemented:**
  * In [db.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/db.py), modify `init_db()` and `get_supabase()` to raise a `RuntimeError("SUPABASE_URL or SUPABASE_KEY environment variables are missing.")` instead of returning a `DummySupabase` client if keys are empty. Delete `DummySupabase`.
  * In [api.js](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/frontend/src/api.js), modify `BASE_URL` to pull from `import.meta.env.VITE_API_BASE_URL`.
  * Configure environment variables directly in `.env` files in both `frontend/` and `backend/`.
  * Rewrite `README.md` to reflect the PostgreSQL/Supabase-only setup and include instructions to execute the Supabase SQL schema.
* **Dependencies / Prerequisites:** None.
* **Frontend Changes:**
  * Modify [api.js](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/frontend/src/api.js) to leverage `import.meta.env.VITE_API_BASE_URL`.
  * Configure `frontend/.env` to define `VITE_API_BASE_URL`.
* **Backend Changes:**
  * Modify `init_db` and `get_supabase` in [db.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/db.py) to fail loudly on missing environment variables.
  * Ensure `backend/.env` is set up with all required secrets.
* **API Endpoints:** None modified.
* **Database Changes:** None.
* **Recommended Folder/File Structure:**
  ```
  insights-copilot/
  ├── README.md (Modified)
  ├── backend/
  │   └── db.py (Modified)
  └── frontend/
      └── src/
          └── api.js (Modified)
  ```
* **Edge Cases & Validation:**
  * Ensure Docker or local startup fails immediately during testing if the backend `.env` variables are empty.
* **Security, Performance & Scalability:**
  * Fail-fast startup checks save compute resources and prevent silent runtime issues.
* **Common Mistakes to Avoid:**
  * Forgetting to update Render/deployment environment variables when pushing the code changes.
* **Milestone / Checkpoint:** Run `python main.py` and `npm run dev` with missing `.env` to verify the application crashes instantly with a clean error message, then run with valid credentials to verify success.

---

### Step 2: Authentication & Multi-Tenant Data Model (A1)
* **What needs to be built:**
  * Integration of Supabase Auth (Email Magic Link / GitHub OAuth) in both the frontend and backend.
  * Database changes to reference a specific `user_id` and restrict records via Row-Level Security (RLS).
  * Backend JWT token verification dependency to authorize endpoint requests.
* **Why it is required:**
  * Fixes the critical data privacy gap where all users share a global workspace log.
  * Ensures that workspace analysis, histories, and Telegram bindings are scoped only to their authenticated owners.
* **How it should be implemented:**
  * **Database Updates:** Alter the schema to add a `user_id` column to existing tables and enable Row-Level Security.
  * **Backend Auth Dependency:** In `main.py`, implement an auth dependency that extracts the Bearer token from the `Authorization` header, verifies the token against Supabase JWT signatures, and provides the authenticated `user_id` to route handlers.
  * **Database Query Filtering:** Update [db.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/db.py) functions to accept a `user_id` parameter and include `.eq("user_id", user_id)` in all Supabase queries.
  * **Frontend Auth flow:** Integrate Supabase's JS SDK client (`@supabase/supabase-js`) in the React app. Add an authentication screen and control states in [App.jsx](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/frontend/src/App.jsx) to hide dashboard views for unauthenticated users. Pass the active JWT token in the header of all `api.js` requests.
* **Dependencies / Prerequisites:**
  * Setup of a Supabase project and configuration of authentication providers (Email or GitHub).
* **Frontend Changes:**
  * Install `@supabase/supabase-js`.
  * Create `frontend/src/components/LoginView.jsx` containing login options.
  * Update [App.jsx](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/frontend/src/App.jsx) to maintain `session` and `user` state, rendering the `LoginView` if unauthenticated.
  * Update [api.js](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/frontend/src/api.js) to dynamically inject the authorization header (`Bearer <JWT>`) into every outgoing fetch call.
* **Backend Changes:**
  * Add a security dependency (e.g., using `PyJWT` or Supabase Python admin helpers) in [main.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/main.py) to authenticate requests.
  * Refactor route handlers (`/api/analyze`, `/api/history`, `/api/history/{id}`, `/api/mentor`, `/api/workspaces/{id}/refresh`, `/api/workspaces/{id}/telegram-link`) to take the decoded `user_id` dependency and pass it down to database query layers.
  * Update all read/write database actions in [db.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/db.py) to enforce `user_id` scoping.
* **API Endpoints:**
  * Modifying ALL existing endpoints to require an `Authorization` header containing the JWT token.
* **Database Changes (Manual Implementation):**
  * **`history` Table:** Add `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`. Add index on `user_id`. Enable RLS.
  * **`workspaces` Table:** Add `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`. Add index on `user_id`. Enable RLS.
  * **`telegram_links` Table:** No schema updates (references `workspace_id`, which now inherently links back to `workspaces` owning a `user_id`).
  * **Row-Level Security Policies:**
    * Enable RLS on `history` and `workspaces`.
    * Policy for `history`: `CREATE POLICY history_policy ON history USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`
    * Policy for `workspaces`: `CREATE POLICY workspaces_policy ON workspaces USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`
  * **Migration Strategy:** Drop existing mock/anonymous rows in the database, or backfill them with a default admin UUID before creating the foreign key constraints.
* **Recommended Folder/File Structure:**
  ```
  frontend/
  └── src/
      ├── components/
      │   └── LoginView.jsx (New)
      ├── App.jsx (Modified)
      └── api.js (Modified)
  ```
* **Edge Cases & Validation:**
  * Invalid/expired JWT tokens must return a `401 Unauthorized` response.
  * Verify that a user cannot retrieve history of another user's workspace even if they guess the workspace ID (verify by checking the database returns empty/null, resulting in a `404 Not Found`).
* **Security, Performance & Scalability:**
  * Row-Level Security (RLS) ensures that even if route logic misses a validation check, data isolation is enforced at the database level.
* **Common Mistakes to Avoid:**
  * Hardcoding JWT validation keys or forgetting to fetch keys dynamically from the Supabase auth endpoints.
* **Milestone / Checkpoint:** Sign in as two different users. Analyze separate ideas. Verify that both the history page and specific workspace endpoints only display records associated with the user currently logged in.

---

## Phase 2: Security, Performance, and Budget Protection

This phase protects API cost margins and ensures systemic stability under load.

### Step 3: Caching & Rate Limiting Layer (A3)
* **What needs to be built:**
  * Per-user rate limiting on `/api/analyze`.
  * An API-level caching system for queries and search results in the pipeline.
* **Why it is required:**
  * Protects third-party API budgets (Tavily, Groq) from automated abuse.
  * Minimizes latency and duplicate API costs if a user queries identical prompts multiple times.
* **How it should be implemented:**
  * **Rate Limiting:** Install `slowapi` in the backend. Configure a limits policy (e.g., `5 requests per minute` and `50 requests per day` per user) keyed against the authenticated `user_id`. Attach the limiter to `/api/analyze`.
  * **Query Caching:** Implement an in-memory TTL cache (e.g., using Python's `cachetools` or standard dictionaries with expiry timestamps) inside `agents.py`. When `research_agent` is called, check the cache for the exact idea hash before invoking Tavily/arXiv APIs.
  * **Exemptions:** Ensure the `/api/workspaces/{id}/refresh` endpoint bypasses search cache entirely to retrieve fresh results, while caching the search *only* for the direct initialization flow.
* **Dependencies / Prerequisites:**
  * Install `slowapi` and `cachetools` in the backend python environment.
* **Frontend Changes:**
  * Handle HTTP `429 Too Many Requests` in [App.jsx](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/frontend/src/App.jsx) and display a user-friendly alert detailing when the user can retry.
* **Backend Changes:**
  * Update `requirements.txt` with `slowapi` and `cachetools`.
  * Setup `slowapi` middleware in [main.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/main.py) and decorate `/api/analyze` with the limiter.
  * Implement query hashing and cached lookups in [agents.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/agents.py) for the API fetching steps.
* **API Endpoints:**
  * `/api/analyze`: Add `429` rate-limit handler.
* **Database Changes:** None.
* **Recommended Folder/File Structure:** None (only modifications to existing backend files).
* **Edge Cases & Validation:**
  * Ensure that the refresh workspace API successfully retrieves new data and updates the cache.
  * Verify rate limiting works correctly under parallel requests from the same user.
* **Security, Performance & Scalability:**
  * Rate-limiting keys are bound to user IDs, not IP addresses, preventing bypass via proxies.
* **Common Mistakes to Avoid:**
  * Using a global cache that shares search results across different users, potentially exposing sensitive ideas. The cache must be scoped or keyed by both `user_id` and query hash.
* **Milestone / Checkpoint:** Run a script sending 10 consecutive requests to `/api/analyze`. Confirm that requests 1-5 return cached values in milliseconds, and subsequent requests are rejected with a `429 Too Many Requests` response.

---

## Phase 3: Core User Features Integration

This phase integrates primary user features that were previously missing or non-functional.

### Step 4: Telegram Frontend Gateway
* **What needs to be built:**
  * A button in the React UI linking the workspace to the Telegram bot.
  * Backend validation verifying workspace ownership before generating linking deep links.
* **Why it is required:**
  * Exposes the background Telegram monitoring bot to the frontend.
  * Prevents authorization bypass where any Telegram user could link to any workspace ID.
* **How it should be implemented:**
  * **Backend Ownership Check:** Update the GET `/api/workspaces/{workspace_id}/telegram-link` endpoint to ensure the authenticated requesting user owns the requested workspace before returning the bot deep link.
  * **Bot Link Logic:** In [start.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/bot/handlers/start.py), when a user executes the `/start <workspace_id>` command, verify that the workspace exists and does not already have an active link.
  * **Multi-workspace Product Decision:** By default, allow a Telegram Chat ID to be linked to only **one active workspace** at a time. If a user starts the bot with a new workspace ID, prompt them in Telegram to confirm switching their active tracking.
  * **Frontend Integration:** Add a "Connect Telegram" button in [PlanCard.jsx](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/frontend/src/components/PlanCard.jsx). Clicking this triggers the API call and opens the deep link `https://t.me/<bot_username>?start=<workspace_id>` in a new tab.
* **Dependencies / Prerequisites:**
  * A fully configured Telegram Bot token and username.
* **Frontend Changes:**
  * Modify [PlanCard.jsx](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/frontend/src/components/PlanCard.jsx) to fetch the deep link and render the "Connect Telegram" button.
* **Backend Changes:**
  * Enforce auth user dependency in the deep link endpoint in [main.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/main.py).
  * Update `telegram_links` handlers to check active links before inserting or overriding records.
* **API Endpoints:**
  * `/api/workspaces/{workspace_id}/telegram-link` (Modified): Added JWT auth filter, verifies workspace ownership.
* **Database Changes (Manual Implementation):**
  * None required on schema. Ensure `telegram_links` table is populated correctly.
* **Recommended Folder/File Structure:** None (only edits to existing components).
* **Edge Cases & Validation:**
  * Requesting a link for a non-existent workspace ID or a workspace owned by someone else must return `403 Forbidden` or `404 Not Found`.
  * If the Telegram bot is started with a missing token or parameter, respond with a helpful help message.
* **Security, Performance & Scalability:**
  * Validating workspace ownership in the web API layer ensures that only authorized workspace owners can expose milestone details to Telegram.
* **Common Mistakes to Avoid:**
  * Exposing raw DB primary keys or system internal data in Telegram responses.
* **Milestone / Checkpoint:** Create a workspace, click "Connect Telegram", and confirm the bot starts, links the workspace correctly, and allows querying `/status` and `/done` milestone indexes successfully.

---

### Step 5: Saved / Favorites View
* **What needs to be built:**
  * Capability to flag specific workspaces as "Saved" or "Favorites".
  * Toggle controls in the frontend and a dedicated view replacing the dead "Saved" link.
* **Why it is required:**
  * Removes the dead sidebar navigation item.
  * Separates transient workspace history from permanently saved/important workspaces.
* **How it should be implemented:**
  * **Database update:** Add a boolean column `is_saved` to the `workspaces` table.
  * **API endpoint:** Build a `PATCH /api/workspaces/{workspace_id}/save` route that toggles the `is_saved` boolean status of the workspace, checking user ownership first.
  * **Frontend implementation:** In [Sidebar.jsx](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/frontend/src/components/Sidebar.jsx), wire up the `saved` route. Create a filtered view in the frontend (or reuse `HistoryView.jsx` passing an `onlySaved={true}` property) to list only workspaces where `is_saved` is `true`.
  * **Dashboard toggle:** Add a star/save icon in [HistoryView.jsx](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/frontend/src/components/HistoryView.jsx) and the active workspace dashboard header to let users toggle the saved state.
* **Dependencies / Prerequisites:** Phase 1 (Auth) must be fully completed.
* **Frontend Changes:**
  * Create `frontend/src/components/SavedView.jsx` (or modify `HistoryView.jsx` to receive filtering props).
  * Add a star/toggle icon in workspace cards/headers.
  * Update [App.jsx](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/frontend/src/App.jsx) to switch to the "Saved" view when selected in the Sidebar.
* **Backend Changes:**
  * Add PATCH route in [main.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/main.py).
  * Add toggle database logic in [db.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/db.py).
* **API Endpoints:**
  * `PATCH /api/workspaces/{workspace_id}/save` (New): Toggles saved state. Returns updated workspace metadata.
  * `GET /api/history` (Modified): Accept a query parameter `?saved=true` to fetch only saved workspaces.
* **Database Changes (Manual Implementation):**
  * **`workspaces` Table:** Add column `is_saved BOOLEAN DEFAULT FALSE NOT NULL`. Add index on `(user_id, is_saved)`.
* **Recommended Folder/File Structure:**
  ```
  frontend/
  └── src/
      └── components/
          └── SavedView.jsx (New, or integrated into HistoryView)
  ```
* **Edge Cases & Validation:**
  * Deleting a saved workspace must cascade delete and clear it from the UI.
* **Security, Performance & Scalability:**
  * Indexing the compound key `(user_id, is_saved)` ensures speedy queries as history scales.
* **Common Mistakes to Avoid:**
  * Creating a brand new table for Saved records; a simple boolean flag on the workspaces table is more efficient.
* **Milestone / Checkpoint:** Click the "Save" icon on a workspace, click the "Saved" sidebar link, and verify only saved items appear. Toggle it off and ensure it disappears from the Saved list.

---

### Step 6: Settings Panel (V1 Theme & Preferences)
* **What needs to be built:**
  * A settings user interface replacing the dead "Settings" sidebar item.
  * A settings schema storing user theme preferences.
* **Why it is required:**
  * Closes the final dead-link UI issue in the application layout.
  * Prepares the frontend to support user personalization features.
* **How it should be implemented:**
  * **Database Table:** Create a `user_settings` table linking to the user account.
  * **API endpoints:** Implement a GET/PUT `/api/settings` pair in the backend to store and fetch theme configuration.
  * **Frontend Settings View:** Create `SettingsView.jsx` with a selector for Theme (Light / Dark).
  * **Tailwind integration:** Make the theme toggle update the `document.documentElement` class list (switching between `light` and `dark`) and save the preference in the database.
  * **BYO API Keys security:** As a best practice, do **not** build Bring-Your-Own (BYO) API key fields in V1 due to encryption complexity. Leave a visible placeholder note in the UI: *"BYO API Keys coming in a future security release"*.
* **Dependencies / Prerequisites:** Phase 1 (Auth) must be fully completed.
* **Frontend Changes:**
  * Create `frontend/src/components/SettingsView.jsx`.
  * Update [App.jsx](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/frontend/src/App.jsx) to route to the Settings view.
  * Setup application-wide theme listeners to load settings on initial user login.
* **Backend Changes:**
  * Create GET/PUT endpoints `/api/settings` in [main.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/main.py).
  * Implement settings retrieval/insertion logic in [db.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/db.py).
* **API Endpoints:**
  * `GET /api/settings` (New): Retrieves current user settings.
  * `PUT /api/settings` (New): Updates user settings.
* **Database Changes (Manual Implementation):**
  * **`user_settings` Table:**
    * Create a new table `user_settings` with columns:
      * `user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
      * `theme VARCHAR(10) DEFAULT 'light' NOT NULL`
      * `updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
    * Enable Row-Level Security:
      * `CREATE POLICY settings_policy ON user_settings USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`
* **Recommended Folder/File Structure:**
  ```
  frontend/
  └── src/
      └── components/
          └── SettingsView.jsx (New)
  ```
* **Edge Cases & Validation:**
  * Enforce string options for theme (reject everything except `'light'` or `'dark'`).
* **Security, Performance & Scalability:**
  * Storing settings in a separate small table prevents bloating the core `workspaces` queries.
* **Common Mistakes to Avoid:**
  * Plaintext storage of API keys if added later. Keep them out of the scope of this step.
* **Milestone / Checkpoint:** Open the settings panel, select Dark Theme, verify the page updates visual states, reload, and confirm the dark state persists.

---

## Phase 4: Reliability & Robustness

This phase guarantees high availability and safeguards system failures.

### Step 7: Model Redundancy (Gemini Fallback)
* **What needs to be built:**
  * Automatic retry mechanisms in the LLM agent calls to fall back to the Gemini API if Groq fails.
* **Why it is required:**
  * Prevents total pipeline failures if Groq hits rate limits, timeouts, or temporary outages.
* **How it should be implemented:**
  * In [agents.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/agents.py), configure a Gemini Async Client (e.g. using `google-genai` or standard SDK/API endpoints) initializing with `GEMINI_API_KEY`.
  * Wrap Groq calls inside `call_llm_json` with a `try/except` block catching rate-limit/timeout exceptions.
  * In the fallback handler, call Gemini using matching system and user prompts, enforcing JSON format.
  * Log fallback occurrences with warning statements to track downstream provider failures.
* **Dependencies / Prerequisites:**
  * Gemini API Key.
* **Frontend Changes:** None.
* **Backend Changes:**
  * Update `requirements.txt` with Gemini libraries (e.g., `google-genai`).
  * Modify [agents.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/agents.py) to declare Gemini client variables.
  * Refactor `call_llm_json` to support try-except fallback logic.
* **API Endpoints:** None.
* **Database Changes:** None.
* **Recommended Folder/File Structure:** None.
* **Edge Cases & Validation:**
  * Verify that formatting errors in Gemini's responses are caught and parsed correctly.
  * Ensure fallbacks do NOT trigger on typical user query validation errors.
* **Security, Performance & Scalability:**
  * Failover mechanism reduces single-point-of-failure risks.
* **Common Mistakes to Avoid:**
  * Masking parsing bugs by falling back to Gemini on ALL errors. Fall back ONLY on connection, timeout, or rate-limit HTTP errors.
* **Milestone / Checkpoint:** Temporarily disable the Groq API key (or change model names to trigger an error). Run an analysis and confirm the roadmap is generated successfully via Gemini by inspecting backend console logs.

---

### Step 8: Observability, Monitoring & Tests
* **What needs to be built:**
  * Structured application logging.
  * Exception monitoring integration (e.g., Sentry).
  * Automated backend test suite validating authentication, schemas, and RLS policies.
* **Why it is required:**
  * Provides operational visibility into asynchronous Telegram bot scheduler errors.
  * Prevents regression bugs when database policies or route authorization rules change.
* **How it should be implemented:**
  * **Structured Logging:** Standardize log formats. Add logs specifying which agent runs, execution latency, and final output status.
  * **Exception Tracking:** Add Sentry SDK integration to the FastAPI app and the Telegram bot daemon loop.
  * **Automated Tests:** Add a test suite using `pytest` and `pytest-asyncio`. Focus on writing:
    1. Row-Level Security tests: Verify User A cannot access User B's resources.
    2. Parsing tests: Validate LLM-generated Mermaid charts and structured JSON shapes.
    3. Auth tests: Verify endpoints block requests missing headers.
* **Dependencies / Prerequisites:**
  * Install `pytest`, `pytest-asyncio`, and `sentry-sdk` in the python environment.
* **Frontend Changes:** None.
* **Backend Changes:**
  * Configure Sentry hooks in [main.py](file:///c:/Users/Lenovo/OneDrive/Desktop/insights-copilot/backend/main.py).
  * Add structured trace statements inside `agents.py` and `scheduler.py`.
  * Add a `tests/` directory with test scripts.
* **API Endpoints:** None.
* **Database Changes:** None.
* **Recommended Folder/File Structure:**
  ```
  backend/
  └── tests/
      ├── __init__.py (New)
      ├── test_auth.py (New)
      ├── test_rls.py (New)
      └── test_parsers.py (New)
  ```
* **Edge Cases & Validation:**
  * Ensure daemon thread exceptions in the Telegram bot are successfully captured by Sentry before the thread terminates.
* **Security, Performance & Scalability:**
  * Automated testing of RLS policies acts as a secure boundary preventing data leaks.
* **Common Mistakes to Avoid:**
  * Running tests against the production database. Use a dedicated test schema or mock database client responses.
* **Milestone / Checkpoint:** Run `pytest` and confirm all auth and parser test cases pass successfully. Verify Sentry logs capture simulated errors.

---

## Phase-wise Milestones & Summary Checkpoints

| Phase | Core Objective | Key Verification Step |
|---|---|---|
| **Phase 1** | Auth & Multi-Tenancy | Sign in with separate credentials; verify User A cannot read User B's workspaces. |
| **Phase 2** | Budget Protection | Trigger 10 quick requests; verify rate limits block requests after threshold is exceeded. |
| **Phase 3** | User Features Integration | Connect Telegram, update index via bot, toggle workspace save state, change CSS settings theme. |
| **Phase 4** | System Reliability | Run tests (`pytest`), disconnect Groq, and confirm Gemini failover takes over successfully. |
