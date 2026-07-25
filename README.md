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

### 💾 Persistent SQLite History
Never lose a good idea. The backend passively saves every completed analysis into a local SQLite database (`insights.db`). The frontend features a dedicated **History View** that lets you instantly restore past case files without needing to re-prompt the AI!

---

## 🚀 Getting Started

### 1. Backend Setup (FastAPI)

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
   Copy `.env.example` to `.env` and fill in your keys:
   ```env
   GROQ_API_KEY=your_groq_api_key
   TAVILY_API_KEY=your_tavily_api_key
   GITHUB_TOKEN=optional_but_recommended
   ```
5. Run the server (this will automatically generate the `insights.db` SQLite file on startup):
   ```bash
   uvicorn main:app --reload
   ```

### 2. Frontend Setup (React + Tailwind + Mermaid)

1. Navigate to the `frontend/` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

---

## 🔌 API Endpoints

- **`POST /api/analyze`**: Kicks off the 3-agent pipeline and returns `{ research, plan, critique }`.
- **`GET /api/history`**: Returns a list of previously analyzed startup ideas.
- **`GET /api/history/{id}`**: Restores the full JSON payload for a specific history item.
- **`POST /api/mentor`**: Ask follow-up questions to the Mentor agent.
- **`GET /api/health`**: Verifies Groq configuration status.
