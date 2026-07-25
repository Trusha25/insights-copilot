# Insights Copilot

Insights Copilot is an AI-powered research assistant built with **FastAPI**, **Groq (llama-3.3-70b-versatile)**, and **React + Tailwind CSS**. It analyzes project ideas, evaluates market landscape, and returns structured research summaries alongside referenced sources.

---

## 📁 Project Structure

```text
insights-copilot/
├── backend/
│   ├── main.py
│   ├── agents.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── components/
│   │       ├── ResearchCard.jsx
│   │       └── PlanCard.jsx
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

---

## 🚀 Getting Started

### 1. Backend Setup (FastAPI)

1. Navigate to the `backend/` folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure your Groq API key:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and add your Groq API key:
     ```env
     GROQ_API_KEY=your_groq_api_key_here
     ```
5. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```
   The API will be available at `http://localhost:8000`. You can view interactive docs at `http://localhost:8000/docs`.

---

### 2. Frontend Setup (React + Tailwind CSS)

1. Navigate to the `frontend/` folder:
   ```bash
   cd frontend
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## 🔌 API Endpoints

- **`POST /analyze`**
  - **Request Body**: `{"idea": "Your project idea string"}`
  - **Response**:
    ```json
    {
      "research": "Detailed research summary and market analysis...",
      "sources": [
        "Source / Solution 1",
        "Source / Solution 2"
      ]
    }
    ```
