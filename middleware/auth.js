/**
 * Authentication middleware - checks if user is logged in
 */
function isAuthenticated(req, res, next) {
  const DEBUG = process.env.DEBUG === 'true';
  
  if (DEBUG) console.log(`[DEBUG] Auth check for ${req.path}: Session user:`, req.session.user);
  
  if (req.session.user) {
    return next();
  }
  
  console.log(`User not authenticated, redirecting to login from ${req.path}`);
  // Store the requested URL to redirect back after login
  req.session.returnTo = req.originalUrl;
  return res.redirect('/login');
}

/**
 * Admin middleware - checks if user is an admin
 */
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).redirect('/');
}

/**
 * API authentication middleware - for JSON responses
 */
function apiAuth(req, res, next) {
  if (req.session.user) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Authentication required' });
}

/**
 * API admin middleware - for JSON responses
 */
function apiAdmin(req, res, next) {
  console.log('API Admin check - session user:', req.session.user);
  
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Administrator access required' });
}

module.exports = { 
  isAuthenticated, 
  isAdmin, 
  apiAuth, 
  apiAdmin 
};
