(function() {
  const API = '/api/auth';
  let isLoginMode = true;

  const formTitle = document.getElementById('formTitle');
  const nameGroup = document.getElementById('nameGroup');
  const submitBtn = document.getElementById('submitBtn');
  const toggleLink = document.getElementById('toggleLink');
  const toggleText = document.getElementById('toggleText');
  const authForm = document.getElementById('authForm');

  function updateMode() {
    if (isLoginMode) {
      formTitle.textContent = 'Welcome to UploadGLC';
      nameGroup.classList.add('hidden');
      submitBtn.textContent = 'Log In';
      toggleText.textContent = "Don't have an account?";
      toggleLink.textContent = 'Sign up';
    } else {
      formTitle.textContent = 'Create an Account';
      nameGroup.classList.remove('hidden');
      submitBtn.textContent = 'Sign Up';
      toggleText.textContent = 'Already have an account?';
      toggleLink.textContent = 'Log in';
    }
  }

  toggleLink.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    updateMode();
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const name = document.getElementById('nameInput').value.trim();

    const endpoint = isLoginMode ? '/login' : '/register';
    const body = isLoginMode ? { email, password } : { email, password, name };

    try {
      const res = await fetch(API + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Something went wrong');
        return;
      }
      if (isLoginMode) {
        window.location.href = '/';
      } else {
        alert('Registered! Please log in.');
        isLoginMode = true;
        updateMode();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });

  // Check if already logged in
  fetch(API + '/me').then(r => r.json()).then(data => {
    if (data.authenticated) window.location.href = '/';
  });

  updateMode();
})();
