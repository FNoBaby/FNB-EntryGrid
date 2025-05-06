const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { isAuthenticated } = require('../middleware/auth');
const { withDatabaseCheck } = require('../db/setup');

/**
 * Creates router for sections endpoints
 * @param {object} pool - Database connection pool
 * @returns {object} Express router
 */
function createSectionsRouter(pool) {
  const router = express.Router();
  
  // Set global flag for database connection status
  global.cardDbConnected = !!pool;

  // Get all sections
  router.get('/', (req, res) => {
    withDatabaseCheck(pool, async (req, res, pool) => {
      const [rows] = await pool.query('SELECT * FROM sections ORDER BY `order`');
      res.json(rows);
    })(req, res);
  });

  // Get a specific section
  router.get('/:id', (req, res) => {
    withDatabaseCheck(pool, async (req, res, pool) => {
      const [rows] = await pool.query('SELECT * FROM sections WHERE id = ?', [req.params.id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Section not found' });
      }
      res.json(rows[0]);
    })(req, res);
  });

  // Create a new section
  router.post('/', isAuthenticated, (req, res) => {
    withDatabaseCheck(pool, async (req, res, pool) => {
      const { title, order } = req.body;
      const id = uuidv4();
      
      await pool.query(
        'INSERT INTO sections (id, title, `order`) VALUES (?, ?, ?)',
        [id, title, order || 1]
      );
      
      const [rows] = await pool.query('SELECT * FROM sections WHERE id = ?', [id]);
      res.status(201).json(rows[0]);
    })(req, res);
  });

  // Update a section
  router.put('/:id', isAuthenticated, (req, res) => {
    withDatabaseCheck(pool, async (req, res, pool) => {
      const { title, order } = req.body;
      
      const [result] = await pool.query(
        'UPDATE sections SET title = ?, `order` = ? WHERE id = ?',
        [title, order, req.params.id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Section not found' });
      }
      
      const [rows] = await pool.query('SELECT * FROM sections WHERE id = ?', [req.params.id]);
      res.json(rows[0]);
    })(req, res);
  });

  // Delete a section
  router.delete('/:id', isAuthenticated, (req, res) => {
    withDatabaseCheck(pool, async (req, res, pool) => {
      try {
        // Start a transaction to ensure both operations succeed or fail together
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
          // Log the delete request for debugging
          console.log(`Deleting section with ID: ${req.params.id}`);
          
          // First delete all cards in the section
          const [cardResult] = await connection.query('DELETE FROM cards WHERE sectionId = ?', [req.params.id]);
          console.log(`Deleted ${cardResult.affectedRows} cards from section ${req.params.id}`);
          
          // Then delete the section
          const [sectionResult] = await connection.query('DELETE FROM sections WHERE id = ?', [req.params.id]);
          
          if (sectionResult.affectedRows === 0) {
            // Rollback if section not found
            await connection.rollback();
            connection.release();
            console.log(`No section found with ID: ${req.params.id}`);
            return res.status(404).json({ error: 'Section not found' });
          }
          
          // Commit the transaction
          await connection.commit();
          connection.release();
          
          console.log(`Successfully deleted section ID: ${req.params.id}`);
          return res.status(200).json({ 
            message: 'Section deleted successfully', 
            id: req.params.id,
            cardsDeleted: cardResult.affectedRows
          });
        } catch (err) {
          // Rollback on error
          await connection.rollback();
          connection.release();
          throw err;
        }
      } catch (err) {
        console.error('Error in DELETE /api/sections/:id:', err);
        return res.status(500).json({ error: 'Database operation failed', details: err.message });
      }
    })(req, res);
  });

  return router;
}

module.exports = createSectionsRouter;
