const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const app = express();
const port = 3001;

// Middleware
app.use(cors({
  origin: "http://localhost:3000", // Changed to frontend port
  credentials: true
}));
app.use(express.json());
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// Session setup
app.use(session({
  secret: "your_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set true only for https
}));

// MySQL DB connection
const db = mysql.createConnection({
  host: "sql12.freesqldatabase.com",
  user: "sql12771601",
  password: "JgBTymPGT4",
  database: "sql12771601"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to MySQL Database");
  }
});

// Make db available to routes
app.locals.db = db;

// Optional: Game routes
const gameRoutes = require('./routes/gameRoutes');
app.use('/', gameRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ✅ Login
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
      req.session.userId = user.UserID; // ✅ set session
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

// ✅ Logout route
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// ✅ Register
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

// Removed duplicate /api/search route - now only in gameRoutes.js

// ✅ Sample protected route
app.get("/api/lists", async (req, res) => {
  if (!req.session.userId) {
    return res.json({ success: false, message: "User not logged in" });
  }

  try {
    const [results] = await db.promise().query(`
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
    `, [req.session.userId]);

    // Group games under each list
    const lists = {};
    results.forEach(row => {
      if (!lists[row.ListID]) {
        lists[row.ListID] = {
          ListID: row.ListID,
          ListName: row.ListName
        };
      }
    });

    res.json({ success: true, lists: Object.values(lists) });

  } catch (err) {
    console.error("Error fetching user lists:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

app.post("/api/lists", async (req, res) => {
  if (!req.session.userId) {
    return res.json({ success: false, message: "User not logged in" });
  }

  const { listName } = req.body;

  try {
    const [result] = await db.promise().query(
      "INSERT INTO PersonalizedList (UserID, ListName) VALUES (?, ?)", 
      [req.session.userId, listName]
    );

    const listId = result.insertId;

    await db.promise().query(
      "INSERT INTO GameList (ListID, GameCount) VALUES (?, 0)",
      [listId]
    );

    res.json({ success: true, listId });
  } catch (err) {
    console.error("Error creating list:", err);
    res.status(500).json({ success: false, message: "Failed to create list" });
  }
});
app.get('/api/auth/status', (req, res) => {
  const isLoggedIn = req.session && req.session.userId ? true : false;
  res.json({ 
    isLoggedIn,
    userId: isLoggedIn ? req.session.userId : null
  });
});
app.post('/games', (req, res) => {
  const { title, description, rating, price, genre, releaseDate } = req.body;

  const query = `
      INSERT INTO Game (Title, Description, Rating, Price, Genre, ReleaseDate)
      VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [title, description, rating, price, genre, releaseDate], (err, result) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database insert error' });
      }
      res.status(201).json({ message: 'Game added!', gameId: result.insertId });
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});