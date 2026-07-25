/**
 * Sends a project idea to the backend FastAPI endpoint for AI research analysis.
 * @param {string} idea - The project idea to analyze.
 * @returns {Promise<{research: string, sources: string[]}>} The analysis response.
 */
export async function analyzeIdea(idea) {
  const response = await fetch('http://localhost:8000/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idea }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Server returned status ${response.status}`);
  }

  return await response.json();
}
