const express = require('express');
const router = express.Router();
const User = require('../models/User');
const path = require('path');

// Login route - GET
router.get('/login', (req, res) => {
  if (req.session.user) {
    console.log('User already logged in, redirecting to dashboard');
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    return res.redirect(returnTo);
  }
  
  console.log('Serving login page');
  res.sendFile(path.join(process.cwd(), 'public', 'login.html'));
});

// Login route - POST - Use Sequelize User model
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const DEBUG = process.env.DEBUG === 'true';
  
  if (DEBUG) console.log(`[DEBUG] Login attempt for user: ${username}`);
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }
  
  try {
    // Find user by username
    const user = await User.findOne({ where: { username: username.toLowerCase() } });
    
    if (!user || !user.isActive) {
      console.log(`Invalid login attempt: user '${username}' not found or inactive`);
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (isMatch) {
      // Update last login time
      await user.update({ lastLogin: new Date() });
      
      // Store user in session (excluding password)
      req.session.user = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      };
      
      // Explicitly save the session
      await new Promise((resolve, reject) => {
        req.session.save(err => {
          if (err) {
            console.error('Error saving session:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      console.log(`User ${username} logged in successfully. Session ID: ${req.session.id}`);
      
      // Get return path and delete it from session
      const returnTo = req.session.returnTo || '/dashboard';
      delete req.session.returnTo;
      
      // Force session save again after modifying it
      await new Promise(resolve => req.session.save(resolve));
      
      // Response based on request type
      if (req.xhr || req.headers.accept.includes('json')) {
        return res.json({ success: true, redirect: returnTo });
      } else {
        return res.redirect(returnTo);
      }
    } else {
      console.log(`Invalid login attempt: wrong password for user '${username}'`);
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Logout route
router.get('/logout', (req, res) => {
  if (req.session.user) {
    console.log(`User ${req.session.user.username} logged out`);
  }
  req.session.destroy(err => {
    if (err) console.error('Error destroying session:', err);
    res.redirect('/login');
  });
});

module.exports = router;
