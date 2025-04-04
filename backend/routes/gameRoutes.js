const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all games with optional filters and sorting
router.get('/api/games', async (req, res) => {
  try {
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

    if (sort === 'price_asc') query += ' ORDER BY Price ASC';
    else if (sort === 'price_desc') query += ' ORDER BY Price DESC';
    else if (sort === 'rating_asc') query += ' ORDER BY Rating ASC';
    else if (sort === 'rating_desc') query += ' ORDER BY Rating DESC';

    const pageSize = parseInt(limit);
    const offset = (parseInt(page) - 1) * pageSize;
    query += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const [results] = await db.promise().query(query, params);
    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:userId/lists
  router.get('/api/users/:userId/lists', (req, res) => {
      const { userId } = req.params;
    
      const query = `
        SELECT 
          pl.ListID,
          pl.ListName,
          g.GameID,
          g.Title,
          g.Description,
          g.Rating,
          g.Price,
          g.Genre,
          g.ReleaseDate
        FROM PersonalizedList pl
        LEFT JOIN GameList gl ON pl.ListID = gl.ListID
        LEFT JOIN Game_Included_in_GameList gigl ON gl.GameListID = gigl.GameListID
        LEFT JOIN Game g ON gigl.GameID = g.GameID
        WHERE pl.UserID = ?
        ORDER BY pl.ListID, g.Title
      `;
    
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('Error fetching user lists:', err);
        return res.status(500).json({ error: 'Failed to fetch lists' });
      }
  
      // Group games under each list
      const lists = {};
      results.forEach(row => {
        if (!lists[row.ListID]) {
          lists[row.ListID] = {
            ListID: row.ListID,
            ListName: row.ListName,
            Games: []
          };
        }
  
        if (row.GameID) {
          lists[row.ListID].Games.push({
            GameID: row.GameID,
            Title: row.Title,
            Description: row.Description,
            Rating: row.Rating,
            Price: row.Price,
            Genre: row.Genre,
            ReleaseDate: row.ReleaseDate
          });
        }
      });
  
      res.json(Object.values(lists));
    });
  });

  // POST /api/users/:userId/lists
router.post('/api/users/:userId/lists', (req, res) => {
    const { userId } = req.params;
    const { listName } = req.body;
  
    const insertList = `INSERT INTO PersonalizedList (UserID, ListName) VALUES (?, ?)`;
  
    db.query(insertList, [userId, listName], (err, result) => {
      if (err) return res.status(500).json({ error: 'Error creating list' });
  
      const listId = result.insertId;
  
      const createGameList = `INSERT INTO GameList (ListID, GameCount) VALUES (?, 0)`;
  
      db.query(createGameList, [listId], (err2) => {
        if (err2) return res.status(500).json({ error: 'List created but failed to initialize GameList' });
  
        res.json({ message: 'List created successfully', listId });
      });
    });
  });

  router.get("/search", async (req, res) => {
    const query = req.query.query;
  
    if (!query) return res.json({ success: false, message: "Empty query" });
  
    try {
      const [games] = await db.promise().query(
        "SELECT GameID, Title AS GameName FROM Game WHERE Title LIKE ?",
        [`%${query}%`]
      );
  
      res.json({ success: true, games });
    } catch (err) {
      console.error("Search error:", err);
      res.status(500).json({ success: false, message: "Search failed" });
    }
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

router.get('/api/lists/:listId', (req, res) => {
  const { listId } = req.params;

  const query = `
    SELECT 
      pl.ListID,
      pl.ListName,
      g.GameID,
      g.Title,
      g.Description,
      g.Rating,
      g.Price,
      g.Genre,
      g.ReleaseDate
    FROM PersonalizedList pl
    LEFT JOIN GameList gl ON pl.ListID = gl.ListID
    LEFT JOIN Game_Included_in_GameList gigl ON gl.GameListID = gigl.GameListID
    LEFT JOIN Game g ON gigl.GameID = g.GameID
    WHERE pl.ListID = ?
  `;

  db.query(query, [listId], (err, results) => {
    if (err) {
      console.error('Error fetching list details:', err);
      return res.status(500).json({ success: false, message: 'Error loading list' });
    }

    if (results.length === 0) {
      return res.json({ success: false, message: 'List not found' });
    }

    const listName = results[0].ListName;
    const games = results
      .filter(row => row.GameID !== null)
      .map(row => ({
        GameID: row.GameID,
        Title: row.Title,
        Description: row.Description,
        Rating: row.Rating,
        Price: row.Price,
        Genre: row.Genre,
        ReleaseDate: row.ReleaseDate
      }));

    res.json({
      success: true,
      list: {
        ListID: listId,
        ListName: listName,
        Games: games
      }
    });
  });
});
// POST /api/lists/:listId/add-game
// POST /api/lists/:listId/add-game
router.post('/api/lists/:listId/add-game', (req, res) => {
  const { listId } = req.params;
  const { gameId } = req.body;

  if (!gameId) {
    return res.status(400).json({ success: false, message: "Missing gameId in request body" });
  }

  // Step 1: Ensure GameList exists or create it
  const getGameListQuery = `SELECT GameListID FROM GameList WHERE ListID = ?`;

  db.query(getGameListQuery, [listId], (err, results) => {
    if (err) {
      console.error("Error querying GameList:", err);
      return res.status(500).json({ success: false, message: 'Database error while fetching GameList' });
    }

    if (results.length === 0) {
      // Auto-create GameList if not present
      const createGameListQuery = `INSERT INTO GameList (ListID) VALUES (?)`;
      db.query(createGameListQuery, [listId], (insertErr, insertResult) => {
        if (insertErr) {
          console.error("Error creating GameList:", insertErr);
          return res.status(500).json({ success: false, message: 'Failed to create GameList for this list' });
        }

        const newGameListId = insertResult.insertId;
        return insertGameIntoList(newGameListId);
      });
    } else {
      const existingGameListId = results[0].GameListID;
      return insertGameIntoList(existingGameListId);
    }
  });

  // Insert function extracted for reuse
  function insertGameIntoList(gameListId) {
    const insertQuery = `
      INSERT IGNORE INTO Game_Included_in_GameList (GameListID, GameID)
      VALUES (?, ?)
    `;

    db.query(insertQuery, [gameListId, gameId], (err) => {
      if (err) {
        console.error("Error inserting game into list:", err);
        return res.status(500).json({ success: false, message: 'Could not add game to list' });
      }

      return res.json({ success: true, message: 'Game successfully added to list' });
    });
  }
});

// DELETE /api/lists/:listId/games
// DELETE /api/lists/:listId/games
router.delete('/api/lists/:listId/games', (req, res) => {
  const { listId } = req.params;
  const { gameName } = req.body;

  if (!gameName) {
    return res.status(400).json({ success: false, message: "Missing gameName in request body" });
  }

  // First: Get the GameID from the game name
  const getGameIdQuery = `SELECT GameID FROM Game WHERE Title = ?`;  // Updated from GameName to Title
  db.query(getGameIdQuery, [gameName], (err, gameResults) => {
    if (err || gameResults.length === 0) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }

    const gameId = gameResults[0].GameID;

    // Then: Get the GameListID from the ListID
    const getGameListIdQuery = `SELECT GameListID FROM GameList WHERE ListID = ?`;
    db.query(getGameListIdQuery, [listId], (err, listResults) => {
      if (err || listResults.length === 0) {
        return res.status(404).json({ success: false, message: "Game list not found" });
      }

      const gameListId = listResults[0].GameListID;

      // Finally: Delete the game from the list
      const deleteQuery = `
        DELETE FROM Game_Included_in_GameList
        WHERE GameListID = ? AND GameID = ?
      `;
      db.query(deleteQuery, [gameListId, gameId], (err, deleteResult) => {
        if (err) {
          console.error("Delete error:", err);
          return res.status(500).json({ success: false, message: "Failed to delete game from list" });
        }

        if (deleteResult.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "Game not in list" });
        }

        return res.json({ success: true, message: "Game removed from list" });
      });
    });
  });
});
// DELETE /api/lists/:listId
router.delete('/api/lists/:listId', (req, res) => {
  const { listId } = req.params;

  // Delete Game_Included_in_GameList entries first
  const deleteGamesQuery = `
    DELETE gigl FROM Game_Included_in_GameList gigl
    JOIN GameList gl ON gigl.GameListID = gl.GameListID
    WHERE gl.ListID = ?
  `;

  db.query(deleteGamesQuery, [listId], (err) => {
    if (err) {
      console.error("Failed to delete games from list:", err);
      return res.status(500).json({ success: false, message: "Error deleting games" });
    }

    // Delete from GameList
    db.query("DELETE FROM GameList WHERE ListID = ?", [listId], (err2) => {
      if (err2) {
        console.error("Failed to delete GameList:", err2);
        return res.status(500).json({ success: false, message: "Error deleting GameList" });
      }

      // Delete from PersonalizedList
      db.query("DELETE FROM PersonalizedList WHERE ListID = ?", [listId], (err3) => {
        if (err3) {
          console.error("Failed to delete PersonalizedList:", err3);
          return res.status(500).json({ success: false, message: "Error deleting PersonalizedList" });
        }

        res.json({ success: true, message: "List deleted successfully" });
      });
    });
  });
});



// In routes or server.js


module.exports = router;
