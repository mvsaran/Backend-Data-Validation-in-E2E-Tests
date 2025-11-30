const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

let db;
const dbPath = 'users.db';

// Initialize SQLite database
async function initDatabase() {
    const SQL = await initSqlJs();

    // Load existing database or create new one
    let buffer;
    if (fs.existsSync(dbPath)) {
        buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // Create users table if it doesn't exist
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      age INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    saveDatabase();
}

// Save database to file
function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes

// Get all users
app.get('/api/users', (req, res) => {
    try {
        const result = db.exec('SELECT * FROM users ORDER BY created_at DESC');
        const users = result.length > 0 ? result[0].values.map(row => ({
            id: row[0],
            username: row[1],
            email: row[2],
            age: row[3],
            created_at: row[4]
        })) : [];
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
    try {
        const result = db.exec('SELECT * FROM users WHERE id = ?', [parseInt(req.params.id)]);
        if (result.length > 0 && result[0].values.length > 0) {
            const row = result[0].values[0];
            const user = {
                id: row[0],
                username: row[1],
                email: row[2],
                age: row[3],
                created_at: row[4]
            };
            res.json({ success: true, user });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get user by username
app.get('/api/users/username/:username', (req, res) => {
    try {
        const result = db.exec('SELECT * FROM users WHERE username = ?', [req.params.username]);
        if (result.length > 0 && result[0].values.length > 0) {
            const row = result[0].values[0];
            const user = {
                id: row[0],
                username: row[1],
                email: row[2],
                age: row[3],
                created_at: row[4]
            };
            res.json({ success: true, user });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create new user
app.post('/api/users', (req, res) => {
    try {
        const { username, email, age } = req.body;

        // Validation
        if (!username || !email || !age) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (age < 1 || age > 150) {
            return res.status(400).json({
                success: false,
                message: 'Age must be between 1 and 150'
            });
        }

        // Insert user
        db.run('INSERT INTO users (username, email, age) VALUES (?, ?, ?)', [username, email, age]);
        saveDatabase();

        // Get the created user
        const result = db.exec('SELECT * FROM users WHERE username = ?', [username]);
        const row = result[0].values[0];
        const user = {
            id: row[0],
            username: row[1],
            email: row[2],
            age: row[3],
            created_at: row[4]
        };

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user
        });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        } else {
            res.status(500).json({ success: false, message: error.message });
        }
    }
});

// Delete user (for test cleanup)
app.delete('/api/users/:id', (req, res) => {
    try {
        db.run('DELETE FROM users WHERE id = ?', [parseInt(req.params.id)]);
        saveDatabase();
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete all users (for test cleanup)
app.delete('/api/users', (req, res) => {
    try {
        db.run('DELETE FROM users');
        saveDatabase();
        res.json({ success: true, message: 'All users deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Start server after database initialization
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`API available at http://localhost:${PORT}/api/users`);
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    saveDatabase();
    db.close();
    process.exit(0);
});
