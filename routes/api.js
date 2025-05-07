const express = require('express');
const router = express.Router();
const User = require('../models/User');
// Import sequelize from the connection module
const { sequelize } = require('../db/connection');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Permission denied' });
};

// Get all users (admin only)
router.get('/users', isAdmin, async (req, res) => {
    try {
        const DEBUG = process.env.DEBUG === 'true';
        if (DEBUG) console.log('API: Fetching all users...');
        
        // Log connection status
        try {
            await sequelize.authenticate();
            if (DEBUG) console.log('Connection has been established successfully.');
        } catch (error) {
            console.error('Unable to connect to the database:', error);
        }
        
        // Try a direct database query first to diagnose issues
        const directResults = await User.findAllUsers();
        if (DEBUG) console.log('Direct SQL query results:', directResults);
        
        // Now try the ORM method
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['username', 'ASC']]
        });
        
        if (DEBUG) {
            console.log(`API: Found ${users.length} users via ORM`);
            
            // Log user objects for debugging (without password)
            console.log('Users via ORM:', users.map(user => ({
                id: user.id,
                username: user.username,
                role: user.role,
                isActive: user.isActive
            })));
        }
        
        return res.json({ success: true, users: directResults.length > 0 ? directResults : users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
    }
});

// Get user by ID (admin only)
router.get('/users/:id', isAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        return res.json({ success: true, user });
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Create new user (admin only)
router.post('/users', isAdmin, async (req, res) => {
    try {
        const { username, password, name, email, role } = req.body;
        const DEBUG = process.env.DEBUG === 'true';
        
        // Validation
        if (!username || !password || !name) {
            return res.status(400).json({
                success: false,
                message: 'Username, password, and name are required'
            });
        }
        
        // Check if username already exists
        const existingUser = await User.findOne({ where: { username: username.toLowerCase() } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }
        
        // Create user - password will be hashed by the beforeCreate hook
        if (DEBUG) console.log(`Creating user ${username} with role ${role || 'user'}`);
        const user = await User.create({
            username: username.toLowerCase(),
            password,
            name,
            email: email || null,
            role: role || 'user',
            isActive: true
        });
        
        if (DEBUG) {
            console.log(`User created with ID: ${user.id}`);
            // Verify password is hashed (don't log the actual hash in production)
            console.log('Password is hashed:', !password.includes(user.password) && user.password.length > 20);
        }
        
        // Return user without password
        const { password: _, ...userWithoutPassword } = user.toJSON();
        
        return res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update user (admin only)
router.put('/users/:id', isAdmin, async (req, res) => {
    try {
        const { name, email, role, isActive, password } = req.body;
        
        // Get the user
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Prevent self-deactivation
        if (user.id.toString() === req.session.user.id.toString() && isActive === false) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }
        
        // Update fields
        const updates = {};
        if (name) updates.name = name;
        if (email !== undefined) updates.email = email || null;
        if (role) updates.role = role;
        if (isActive !== undefined) updates.isActive = isActive;
        if (password) updates.password = password;
        
        await user.update(updates);
        
        return res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete user (admin only)
router.delete('/users/:id', isAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Prevent self-deletion
        if (user.id.toString() === req.session.user.id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }
        
        await user.destroy();
        
        return res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
