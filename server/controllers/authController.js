const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, '../../.users.json');

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
  catch { return {}; }
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

const authController = {
  // Local login
  localLogin: (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const users = loadUsers();
    const user = users[email];
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    req.session.userId = user.id;
    req.session.user = { id: user.id, email: user.email, name: user.name, provider: user.provider };
    res.json({ message: 'Logged in', user: req.session.user });
  },

  // Local register
  localRegister: (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const users = loadUsers();
    if (users[email]) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const id = require('uuid').v4();
    const passwordHash = bcrypt.hashSync(password, 10);
    users[email] = { id, email, name: name || email, passwordHash, provider: 'local' };
    saveUsers(users);
    res.json({ message: 'Registered successfully' });
  },

  // OAuth callback success
  oauthCallback: (provider) => (req, res) => {
    if (req.user) {
      req.session.userId = req.user.id;
      req.session.user = req.user;
    }
    res.redirect('/');
  },

  // Get current user
  me: (req, res) => {
    if (req.session && req.session.user) {
      return res.json({ authenticated: true, user: req.session.user });
    }
    return res.json({ authenticated: false });
  },

  // Logout
  logout: (req, res) => {
    req.session.destroy(() => {
      res.json({ message: 'Logged out' });
    });
  }
};

module.exports = { authController, loadUsers, saveUsers };
