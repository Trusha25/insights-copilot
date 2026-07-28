const BASE_URL = import.meta.env.DEV 
  ? 'http://127.0.0.1:8000' 
  : 'https://insights-copilot-s35d.onrender.com';

export async function analyzeIdea(idea) {
  const response = await fetch(`${BASE_URL}/api/analyze`, {
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
  const response = await fetch(`${BASE_URL}/api/history`);
  if (!response.ok) throw new Error('Failed to fetch history');
  return await response.json();
}

export async function fetchHistoryItem(id) {
  const response = await fetch(`${BASE_URL}/api/history/${id}`);
  if (!response.ok) throw new Error('Failed to fetch history item');
  return await response.json();
}

export async function askMentor(payload) {
  const response = await fetch(`${BASE_URL}/api/mentor`, {
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

export async function refreshWorkspace(workspaceId) {
  const response = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to refresh workspace research');
  }
  return await response.json();
}
