const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require('path');
require("dotenv").config();


const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.use('/frontend', express.static(path.join(__dirname, '../frontend')));


const gameRoutes = require('./routes/gameRoutes');
app.use('/', gameRoutes);

// Create MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "santhosh@2006", 
  database: "game_list_db"
});

// Test DB connection
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to MySQL Database");
  }
});

// Example route (test)
app.get("/", (req, res) => {
  res.send("Backend is running");
  app.get('/api/games', (req, res) => {
    let { search, genre, minPrice, maxPrice, page = 1, limit = 5, sort } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
  
    let filteredGames = [...games]; // assuming 'games' is your full game list
  
    if (search) {
      filteredGames = filteredGames.filter(game =>
        game.Title.toLowerCase().includes(search.toLowerCase())
      );
    }
  
    if (genre) {
      filteredGames = filteredGames.filter(game => game.Genre === genre);
    }
  
    if (minPrice) {
      filteredGames = filteredGames.filter(game => game.Price >= parseFloat(minPrice));
    }
  
    if (maxPrice) {
      filteredGames = filteredGames.filter(game => game.Price <= parseFloat(maxPrice));
    }
  
    // 🔽 ADD THIS: Sorting
    if (sort === 'price_asc') {
      filteredGames.sort((a, b) => a.Price - b.Price);
    } else if (sort === 'price_desc') {
      filteredGames.sort((a, b) => b.Price - a.Price);
    } else if (sort === 'rating_asc') {
      filteredGames.sort((a, b) => a.Rating - b.Rating);
    } else if (sort === 'rating_desc') {
      filteredGames.sort((a, b) => b.Rating - a.Rating);
    }
  
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedGames = filteredGames.slice(startIndex, endIndex);
  
    res.json(paginatedGames);
  });
  
});
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
  
    const query = "SELECT * FROM User WHERE Email = ? AND Password = ?";
    db.query(query, [email, password], (err, results) => {
      if (err) {
        console.error("Error during login:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
      }
  
      if (results.length > 0) {
        const user = results[0];
        res.json({
          success: true,
          user: {
            id: user.UserID,
            username: user.Username,
            role: user.Role
          }
        });
      } else {
        res.json({ success: false, message: "Invalid email or password" });
      }
    });
  });
  app.post("/api/register", (req, res) => {
    const { username, email, password, role } = req.body;
  
    const checkQuery = "SELECT * FROM User WHERE Email = ?";
    db.query(checkQuery, [email], (err, results) => {
      if (err) {
        console.error("Error checking existing user:", err);
        return res.status(500).json({ success: false, message: "Server error" });
      }
  
      if (results.length > 0) {
        return res.json({ success: false, message: "Email already registered" });
      }
  
      const insertQuery = "INSERT INTO User (Username, Email, Password, Role) VALUES (?, ?, ?, ?)";
      db.query(insertQuery, [username, email, password, role || "user"], (err, result) => {
        if (err) {
          console.error("Error inserting user:", err);
          return res.status(500).json({ success: false, message: "Registration failed" });
        }
  
        res.json({ success: true, message: "User registered successfully" });
      });
    });
  });
  
  
// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
