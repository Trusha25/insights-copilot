export async function analyzeIdea(idea) {
  const response = await fetch('https://insights-copilot-s35d.onrender.com/api/analyze', {
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
  const response = await fetch('https://insights-copilot-s35d.onrender.com/api/history');
  if (!response.ok) throw new Error('Failed to fetch history');
  return await response.json();
}

export async function fetchHistoryItem(id) {
  const response = await fetch(`https://insights-copilot-s35d.onrender.com/api/history/${id}`);
  if (!response.ok) throw new Error('Failed to fetch history item');
  return await response.json();
}

export async function askMentor(payload) {
  const response = await fetch('https://insights-copilot-s35d.onrender.com/api/mentor', {
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
