const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { isAuthenticated } = require('../middleware/auth');
const { withDatabaseCheck } = require('../db/setup');

/**
 * Creates router for cards endpoints
 * @param {object} pool - Database connection pool
 * @returns {object} Express router
 */
function createCardsRouter(pool) {
  const router = express.Router();

  // Get all cards
  router.get('/', (req, res) => {
    withDatabaseCheck(pool, async (req, res, pool) => {
      try {
        let query = 'SELECT * FROM cards';
        const params = [];
        
        // Filter by section if provided
        if (req.query.sectionId) {
          query += ' WHERE sectionId = ?';
          params.push(req.query.sectionId);
        }
        
        query += ' ORDER BY sectionId, `order`';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
      } catch (err) {
        console.error('Error getting cards:', err);
        res.status(500).json({ error: 'Database operation failed', details: err.message });
      }
    })(req, res);
  });

  // Get a specific card
  router.get('/:id', (req, res) => {
    withDatabaseCheck(pool, async (req, res, pool) => {
      const [rows] = await pool.query('SELECT * FROM cards WHERE id = ?', [req.params.id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Card not found' });
      }
      res.json(rows[0]);
    })(req, res);
  });

  // Create a new card
  router.post('/', isAuthenticated, (req, res) => {
    withDatabaseCheck(pool, async (req, res, pool) => {
      const { 
        title, description, url, iconType, imageUrl, bootstrapIcon, 
        buttonIcon, sectionId, order, iconColor 
      } = req.body;
      
      const id = uuidv4();
      
      await pool.query(
        `INSERT INTO cards (id, title, description, url, iconType, imageUrl, bootstrapIcon, buttonIcon, sectionId, \`order\`, iconColor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, title, description, url, iconType, imageUrl, bootstrapIcon, buttonIcon, sectionId, 
          order || 1, 
          iconType === 'bootstrap' ? (iconColor || '#0d6efd') : null // Default to blue if not specified
        ]
      );
      
      const [rows] = await pool.query('SELECT * FROM cards WHERE id = ?', [id]);
      res.status(201).json(rows[0]);
    })(req, res);
  });

  // Update a card
  router.put('/:id', isAuthenticated, (req, res) => {
    withDatabaseCheck(pool, async (req, res, pool) => {
      const { 
        title, description, url, iconType, imageUrl, bootstrapIcon, 
        buttonIcon, sectionId, order, iconColor 
      } = req.body;
      
      const [result] = await pool.query(
        `UPDATE cards
         SET title = ?, description = ?, url = ?, iconType = ?, imageUrl = ?,
         bootstrapIcon = ?, buttonIcon = ?, sectionId = ?, \`order\` = ?, iconColor = ?
         WHERE id = ?`,
        [
          title, description, url, iconType, imageUrl, bootstrapIcon, buttonIcon, sectionId, order, 
          iconType === 'bootstrap' ? (iconColor || '#0d6efd') : null, // Default to blue if not specified
          req.params.id
        ]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Card not found' });
      }
      
      const [rows] = await pool.query('SELECT * FROM cards WHERE id = ?', [req.params.id]);
      res.json(rows[0]);
    })(req, res);
  });

  // Delete a card
  router.delete('/:id', isAuthenticated, (req, res) => {
    withDatabaseCheck(pool, async (req, res, pool) => {
      try {
        // Log the delete request for debugging
        console.log(`Deleting card with ID: ${req.params.id}`);
        
        // Execute the query with proper error handling
        const [result] = await pool.query('DELETE FROM cards WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
          console.log(`No card found with ID: ${req.params.id}`);
          return res.status(404).json({ error: 'Card not found' });
        }
        
        console.log(`Successfully deleted card ID: ${req.params.id}`);
        return res.status(200).json({ message: 'Card deleted successfully', id: req.params.id });
      } catch (err) {
        console.error('Error in DELETE /api/cards/:id:', err);
        return res.status(500).json({ error: 'Database operation failed', details: err.message });
      }
    })(req, res);
  });

  return router;
}

module.exports = createCardsRouter;
