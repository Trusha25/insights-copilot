// Local development uses the patched FastAPI backend. Production deployments
// should provide VITE_API_BASE_URL explicitly at build time.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function analyzeIdea(idea) {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Server returned status ${response.status}`);
  }
  return await response.json();
}

export async function fetchHistory() {
  const response = await fetch(`${API_BASE_URL}/api/history`);
  if (!response.ok) throw new Error('Failed to fetch history');
  return await response.json();
}

export async function fetchHistoryItem(id) {
  const response = await fetch(`${API_BASE_URL}/api/history/${id}`);
  if (!response.ok) throw new Error('Failed to fetch history item');
  return await response.json();
}

export async function askMentor(payload) {
  const response = await fetch(`${API_BASE_URL}/api/mentor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Server returned status ${response.status}`);
  }
  return await response.json();
}
