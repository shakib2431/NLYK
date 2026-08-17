// Fire-and-forget transactional emails. Templates live server-side.
const apiBase = () => process.env.REACT_APP_BACKEND_URL;

const getUserEmail = () => {
  try {
    const user = JSON.parse(localStorage.getItem('nalayak_user') || 'null');
    return user?.email || null;
  } catch {
    return null;
  }
};

export const sendWelcomeEmail = (kind) => {
  try {
    const user = JSON.parse(localStorage.getItem('nalayak_user') || 'null');
    if (!user?.email) return;
    fetch(`${apiBase()}/api/email/welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, name: user.name, kind }),
    }).catch(() => {});
  } catch { /* no user — skip */ }
};

export const registerDropAlert = (slug) => {
  const email = getUserEmail();
  if (!email) return;
  fetch(`${apiBase()}/api/alerts/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, slug }),
  }).catch(() => {});
};
