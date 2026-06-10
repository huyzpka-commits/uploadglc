const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const DropboxOAuth2Strategy = require('passport-dropbox-oauth2').Strategy;
const { authController, loadUsers, saveUsers } = require('../controllers/authController');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

function findOrCreateOAuthUser(profile, provider) {
  const users = loadUsers();
  const email = profile.emails && profile.emails[0] ? profile.emails[0].value : profile.id + '@' + provider + '.local';
  const existing = Object.values(users).find(u => u.email === email && u.provider === provider);
  if (existing) return existing;
  const id = uuidv4();
  const user = { id, email, name: profile.displayName || email, provider, profileId: profile.id };
  users[email] = user;
  saveUsers(users);
  return user;
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const users = loadUsers();
  const user = Object.values(users).find(u => u.id === id);
  done(null, user || null);
});

// Local strategy
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
  const users = loadUsers();
  const user = users[email];
  if (!user) return done(null, false);
  const bcrypt = require('bcryptjs');
  if (!bcrypt.compareSync(password, user.passwordHash)) return done(null, false);
  return done(null, user);
}));

// Google OAuth
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/google/callback`
  }, (accessToken, refreshToken, profile, done) => {
    done(null, findOrCreateOAuthUser(profile, 'google'));
  }));
}

// Microsoft OAuth
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/microsoft/callback`,
    scope: ['user.read']
  }, (accessToken, refreshToken, profile, done) => {
    done(null, findOrCreateOAuthUser(profile, 'microsoft'));
  }));
}

// Dropbox OAuth
if (process.env.DROPBOX_CLIENT_ID && process.env.DROPBOX_CLIENT_SECRET) {
  passport.use(new DropboxOAuth2Strategy({
    apiVersion: '2',
    clientID: process.env.DROPBOX_CLIENT_ID,
    clientSecret: process.env.DROPBOX_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/dropbox/callback`
  }, (accessToken, refreshToken, profile, done) => {
    done(null, findOrCreateOAuthUser(profile, 'dropbox'));
  }));
}

// Local auth routes
router.post('/register', authController.localRegister);
router.post('/login', passport.authenticate('local'), authController.localLogin);
router.get('/logout', authController.logout);
router.get('/me', authController.me);

// OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login.html' }), authController.oauthCallback('google'));

router.get('/microsoft', passport.authenticate('microsoft', { scope: ['user.read'] }));
router.get('/microsoft/callback', passport.authenticate('microsoft', { failureRedirect: '/login.html' }), authController.oauthCallback('microsoft'));

router.get('/dropbox', passport.authenticate('dropbox-oauth2'));
router.get('/dropbox/callback', passport.authenticate('dropbox-oauth2', { failureRedirect: '/login.html' }), authController.oauthCallback('dropbox'));

module.exports = router;
