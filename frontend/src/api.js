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

export async function fetchHistory(savedOnly = false) {
  const headers = await getHeaders();
  const url = savedOnly ? `${BASE_URL}/api/history?saved=true` : `${BASE_URL}/api/history`;
  const response = await fetch(url, {
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

export async function toggleSaveWorkspace(workspaceId) {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/save`, {
    method: 'PATCH',
    headers,
  });
  if (!response.ok) throw new Error('Failed to toggle save workspace');
  return await response.json();
}

export async function fetchSettings() {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/api/settings`, {
    headers,
  });
  if (!response.ok) throw new Error('Failed to fetch settings');
  return await response.json();
}

export async function saveSettings(theme, primaryModel = null) {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/api/settings`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ theme, primary_model: primaryModel }),
  });
  if (!response.ok) throw new Error('Failed to save settings');
  return await response.json();
}

export async function fetchWorkspaces() {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/api/workspaces`, {
    headers,
  });
  if (!response.ok) throw new Error('Failed to fetch workspaces');
  return await response.json();
}

export async function fetchTelegramLink(workspaceId) {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/telegram-link`, {
    headers,
  });
  if (!response.ok) throw new Error('Failed to fetch Telegram link');
  return await response.json();
}

export async function sendChatMessage(workspaceId, message) {
  const headers = await getHeaders();
  const response = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Server returned status ${response.status}`);
  }
  return await response.json();
}
