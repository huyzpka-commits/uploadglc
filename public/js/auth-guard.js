(function() {
  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (!data.authenticated) {
        window.location.href = '/login.html';
        return;
      }
      const user = data.user;
      const elName = document.getElementById('userName');
      const elEmail = document.getElementById('userEmail');
      const elAvatar = document.getElementById('userAvatar');
      if (elName) elName.textContent = user.name || user.email || 'User';
      if (elEmail) elEmail.textContent = user.email || '';
      if (elAvatar) elAvatar.textContent = (user.name || user.email || 'U').charAt(0).toUpperCase();
    } catch (err) {
      console.error('Auth check failed', err);
      window.location.href = '/login.html';
    }
  }

  window.logout = async function() {
    try {
      await fetch('/api/auth/logout', { credentials: 'include' });
    } catch (e) {}
    window.location.href = '/login.html';
  };

  checkAuth();
})();
