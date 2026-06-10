function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

function optionalAuth(req, res, next) {
  if (req.session && req.session.userId) {
    req.user = req.session.user;
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
