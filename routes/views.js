const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Debug routes - only available in development
if (process.env.ENVIRONMENT !== 'PROD' || process.env.DEBUG === 'true') {
  router.get('/debug-session', (req, res) => {
    res.json({
      environment: process.env.ENVIRONMENT,
      sessionExists: !!req.session,
      isAuthenticated: !!req.session.user,
      sessionData: req.session,
      cookies: req.headers.cookie
    });
  });
}

// Redirecting root to dashboard
router.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Dashboard route with authentication
router.get('/dashboard', isAuthenticated, (req, res) => {
  console.log(`Serving dashboard to authenticated user: ${req.session.user.username}`);
  
  const indexPath = path.join(process.cwd(), 'public', 'index.html');
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Server Error');
    }
    
    let rendered = data;
    
    // Add user info to the page
    if (req.session && req.session.user) {
      rendered = rendered.replace(
        /<span id="user-name">User<\/span>/,
        `<span id="user-name">${req.session.user.name || req.session.user.username}</span>`
      );
      
      // If user is admin, make admin link visible
      if (req.session.user.role === 'admin') {
        rendered = rendered.replace(
          /<span id="admin-link-container" class="d-none">/,
          '<span id="admin-link-container">'
        );
      }
    }
    
    // Add database connection warning if needed
    if (!global.cardDbConnected) {
      const dbWarning = `
        <div class="alert alert-warning alert-dismissible fade show mb-4" role="alert">
          <h4 class="alert-heading"><i class="bi bi-exclamation-triangle me-2"></i>Database Connection Issue</h4>
          <p>The server is running in limited mode because it couldn't connect to the database.</p>
          <hr>
          <p class="mb-0">Please check your database settings or contact the administrator.</p>
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;
      
      // Insert the warning after the page header
      const headerEndPos = rendered.indexOf('</div>', rendered.indexOf('page-header'));
      if (headerEndPos !== -1) {
        rendered = rendered.slice(0, headerEndPos + 6) + dbWarning + rendered.slice(headerEndPos + 6);
      }
    }
    
    res.send(rendered);
  });
});

// Admin page
router.get('/admin', isAuthenticated, isAdmin, (req, res) => {
  console.log(`Serving admin page to admin user: ${req.session.user.username}`);
  res.sendFile(path.join(process.cwd(), 'public', 'admin.html'));
});

// User info API
router.get('/api/user', isAuthenticated, (req, res) => {
  res.json({ user: req.session.user });
});

module.exports = router;
