# Insights Copilot V2

Insights Copilot is a powerful AI-driven startup research assistant. By chaining together four specialized LLM agents (powered by Groq's high-speed Llama 3.3 70B model) and integrating with real-world external APIs, it transforms a simple one-sentence startup idea into a comprehensive, deeply researched technical design document in seconds.

## 🌟 Key Features

### 🧠 The Four-Agent Pipeline
Instead of a single prompt, Insights Copilot runs a highly structured, multi-agent pipeline:
1. **Research Agent**: Concurrently fetches real-time data from **Tavily** (web search), **GitHub** (repository search), and **arXiv** (academic papers) to perform problem validation and market research.
2. **Planner Agent**: Analyzes the research to design a scalable technical architecture and plots out a highly detailed, 5-step minute-by-minute execution roadmap.
3. **Critic Agent**: Reviews the proposed plan against strict criteria (actionable, verifiable, scalable) and flags potential risks or design flaws.
4. **Mentor Agent (Optional)**: Acts as an interactive startup advisor for any follow-up questions regarding the generated plan.

### 🎨 Premium Light Dashboard UI
The frontend has been completely overhauled into a beautiful, fluid 4-column light-themed React dashboard containing:
- **Technical Analysis**: Displays problem validation, market research, and any flagged risks.
- **Project Architecture**: Features dynamic, AI-generated **Mermaid.js Flowcharts** that visually map out the recommended backend/frontend/database topology.
- **5-Step Execution Roadmap**: A detailed, milestone-based checklist to get your project off the ground.
- **Key Resources**: A curated list of GitHub repositories and academic papers relevant to your specific idea.

### 💾 Persistent Supabase History
Never lose a good idea. The backend saves completed analysis, workspace states, and Telegram bot linking data into a hosted PostgreSQL/Supabase database. The frontend features a dedicated **History View** that lets you instantly restore past case files without needing to re-prompt the AI!

---

## 🚀 Getting Started

### 1. Database Setup (Supabase)
Before starting the backend, you need a Supabase PostgreSQL instance:
1. Create a new project in [Supabase](https://supabase.com/).
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Copy the contents of `backend/supabase_schema.sql` and run them to initialize the tables (`history`, `workspaces`, and `telegram_links`).

### 2. Backend Setup (FastAPI)

1. Navigate to the `backend/` folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # macOS/Linux
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Environment Variables:
   Create a `.env` file in the `backend/` directory and configure the environment variables:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_public_key
   GROQ_API_KEY=your_groq_api_key
   TAVILY_API_KEY=your_tavily_api_key
   GITHUB_TOKEN=optional_but_recommended
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   TELEGRAM_BOT_USERNAME=your_telegram_bot_username
   ```
5. Run the server (this will fail loudly at startup if `SUPABASE_URL` or `SUPABASE_KEY` are not configured):
   ```bash
   uvicorn main:app --reload
   ```

### 3. Frontend Setup (React + Tailwind + Vite)

1. Navigate to the `frontend/` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Environment Variables:
   Create a `.env` file in the `frontend/` directory and configure the API URL:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

---

## 🔌 API Endpoints

- **`POST /api/analyze`**: Kicks off the 3-agent pipeline and returns `{ research, plan, critique }`.
- **`GET /api/history`**: Returns a list of previously analyzed startup ideas.
- **`GET /api/history/{id}`**: Restores the full JSON payload for a specific history item.
- **`POST /api/mentor`**: Ask follow-up questions to the Mentor agent.
- **`POST /api/workspaces/{workspace_id}/refresh`**: Re-run the research agent to identify new external resources, computing diffs.
- **`GET /api/workspaces/{workspace_id}/telegram-link`**: Retrieve a deep link to start the Telegram bot monitoring checklist.
- **`GET /api/health`**: Verifies Groq and Supabase configuration status.
