
const emailLogin    = document.getElementById('email-login');
const passLogin     = document.getElementById('pass-login');
const loginErr      = document.getElementById('login-error');

export function clearLoginForm() {
  emailLogin.value = '';
  passLogin.value = '';
  loginErr.textContent = '';
}

export function showSuccessMessage(button, text) {
  const msg = document.createElement('div');
  msg.className = 'success-message';
  msg.textContent = text;
  button.insertAdjacentElement('afterend', msg);
  return msg;
}

export async function updateParseButtonVisibility(runBtn) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  let isProfile = false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    isProfile = (host === 'www.linkedin.com' || host === 'linkedin.com') && u.pathname.startsWith('/in/');
  } catch {
    // invalid URL
  }
  runBtn.style.display = isProfile ? 'inline-block' : 'none';
}