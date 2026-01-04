const express = require("express");
const bcrypt = require("bcrypt");
const { getDb } = require("../models/db");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const db = await getDb();

    const existingUser = await db.get(
      "SELECT * FROM users WHERE username = ?",
      username,
    );
    if (existingUser) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
    );

    req.session.userId = result.lastID;
    req.session.username = username;

    res.status(201).json({ success: true, username });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const db = await getDb();

    const user = await db.get(
      "SELECT * FROM users WHERE username = ?",
      username,
    );
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ success: true, username: user.username });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/check", (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      username: req.session.username,
    });
  } else {
    res.json({ authenticated: false });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true });
  });
});

router.get("/users", async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.all("SELECT username FROM users ORDER BY username ASC");
    res.json(users);
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
});

module.exports = router;
