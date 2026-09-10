(() => {
  const TOKEN_KEY = 'avos_session';
  const token = localStorage.getItem(TOKEN_KEY);
  const next = encodeURIComponent(location.pathname + location.search);

  window.avosLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    location.replace('/login/');
  };

  if (!token) {
    location.replace('/login/?next=' + next);
    return;
  }

  fetch('/api/session', {
    headers: { Authorization: 'Bearer ' + token },
    cache: 'no-store'
  }).then(async (res) => {
    if (!res.ok) throw new Error('invalid_session');
    const data = await res.json();
    window.AVOS_USER = data.user || null;
    document.documentElement.classList.add('avos-authenticated');
  }).catch(() => {
    localStorage.removeItem(TOKEN_KEY);
    location.replace('/login/?next=' + next);
  });
})();
