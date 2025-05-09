// api.js
const API_BASE = 'http://localhost:3000';

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || `Status ${res.status}`);
  }
  return res.json(); // { token, userId }
}

export async function register(email, password) {
  const res = await fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (res.status === 409) throw new Error('Email already registered');
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || `Status ${res.status}`);
  }
  return res.json(); // { userId }
}

export async function saveProfile(token, userId, data) {
  const res = await fetch(`${API_BASE}/api/save-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId, ...data })
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
  return res.json();
}