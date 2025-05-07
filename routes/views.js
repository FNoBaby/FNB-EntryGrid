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
  const DEBUG = process.env.DEBUG === 'true';
  if (DEBUG) {
    console.log(`Serving dashboard to authenticated user: ${req.session.user.username}`);
    console.log('User session data:', req.session.user);
  }
  
  const indexPath = path.join(process.cwd(), 'public', 'index.html');
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Server Error');
    }
    
    let rendered = data;
    
    // Add user info to the page
    if (req.session && req.session.user) {
      const displayName = req.session.user.name || req.session.user.username;
      if (DEBUG) console.log('Using display name:', displayName);
      
      // Update username in both places (page header and navbar)
      rendered = rendered.replace(
        /<span id="nav-user-name">User<\/span>/g,
        `<span id="nav-user-name">${displayName}</span>`
      );
      
      rendered = rendered.replace(
        /<span id="user-name">User<\/span>/g,
        `<span id="user-name">${displayName}</span>`
      );
      
      // Set the avatar initial
      const initial = displayName.charAt(0).toUpperCase();
      rendered = rendered.replace(
        /<span id="avatar-initial">U<\/span>/g,
        `<span id="avatar-initial">${initial}</span>`
      );
      
      // If user is admin, make admin nav visible
      if (req.session.user.role === 'admin') {
        rendered = rendered.replace(
          /<li class="nav-item" id="admin-nav-item">/,
          '<li class="nav-item" id="admin-nav-item">'
        );
        
        // Legacy admin link container - keep for backward compatibility
        rendered = rendered.replace(
          /<span id="admin-link-container" class="d-none">/,
          '<span id="admin-link-container">'
        );
      } else {
        // Hide admin nav for non-admin users
        rendered = rendered.replace(
          /<li class="nav-item" id="admin-nav-item">/,
          '<li class="nav-item d-none" id="admin-nav-item">'
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
  const DEBUG = process.env.DEBUG === 'true';
  if (DEBUG) console.log(`Serving admin page to admin user: ${req.session.user.username}`);
  res.sendFile(path.join(process.cwd(), 'public', 'admin.html'));
});

// User info API
router.get('/api/user', isAuthenticated, (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  res.json({ 
    user: {
      id: req.session.user.id,
      username: req.session.user.username,
      name: req.session.user.name,
      role: req.session.user.role,
      email: req.session.user.email
    } 
  });
});

module.exports = router;
