const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all games with optional filters and sorting
router.get('/api/games', (req, res) => {
  const { search, genre, minPrice, maxPrice, page = 1, limit = 5, sort } = req.query;

  let query = 'SELECT * FROM Game WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND Title LIKE ?';
    params.push(`%${search}%`);
  }

  if (genre) {
    query += ' AND Genre = ?';
    params.push(genre);
  }

  if (minPrice) {
    query += ' AND Price >= ?';
    params.push(minPrice);
  }

  if (maxPrice) {
    query += ' AND Price <= ?';
    params.push(maxPrice);
  }

  // 🔽 Sorting logic
  if (sort === 'price_asc') {
    query += ' ORDER BY Price ASC';
  } else if (sort === 'price_desc') {
    query += ' ORDER BY Price DESC';
  } else if (sort === 'rating_asc') {
    query += ' ORDER BY Rating ASC';
  } else if (sort === 'rating_desc') {
    query += ' ORDER BY Rating DESC';
  }

  // Pagination
  query += ' LIMIT ? OFFSET ?';
  const pageSize = parseInt(limit);
  const offset = (parseInt(page) - 1) * pageSize;
  params.push(pageSize, offset);

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Search error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(results);
  });
});

// POST new game
router.post('/games', (req, res) => {
  const { Title, Description, Rating, Price, Genre, ReleaseDate } = req.body;

  if (!Title || !Price) {
    return res.status(400).json({ error: 'Title and Price are required' });
  }

  const query = `
    INSERT INTO Game (Title, Description, Rating, Price, Genre, ReleaseDate)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [Title, Description, Rating, Price, Genre, ReleaseDate],
    (err, result) => {
      if (err) {
        console.error('Error adding game:', err);
        return res.status(500).json({ error: 'Failed to add game' });
      }
      res.json({ message: 'Game added successfully', gameId: result.insertId });
    }
  );
});

module.exports = router;
