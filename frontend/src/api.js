import { supabase } from './supabaseClient';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export async function analyzeIdea(idea) {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ idea }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Server returned status ${response.status}`);
  }
  return await response.json();
}

export async function fetchHistory() {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/api/history`, {
    headers,
  });
  if (!response.ok) throw new Error('Failed to fetch history');
  return await response.json();
}

export async function fetchHistoryItem(id) {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/api/history/${id}`, {
    headers,
  });
  if (!response.ok) throw new Error('Failed to fetch history item');
  return await response.json();
}

export async function askMentor(payload) {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/api/mentor`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Server returned status ${response.status}`);
  }
  return await response.json();
}

export async function refreshWorkspace(workspaceId) {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/refresh`, {
    method: 'POST',
    headers,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to refresh workspace research');
  }
  return await response.json();
}
