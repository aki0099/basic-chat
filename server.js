// =====================
// Database initialization (PostgreSQL)
// =====================
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/chatdb",
  ssl: false
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("PostgreSQL ready");
}

// =====================
// Allowed users with passwords
// =====================
const ALLOWED_USERS = {
  akhil: "AKU123",
  apoorva: "apu123"
};

// =====================
// Server initialization
// =====================
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =====================
// Chat state
// =====================
const users = new Map();
const MAX_USERS = 6;

// =====================
// Socket.IO logic
// =====================
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  if (users.size >= MAX_USERS) {
    socket.emit("room_full", "Chat room is full (max 6 users)");
    socket.disconnect();
    return;
  }

  socket.on("join", async ({ username, password }) => {

    if (!ALLOWED_USERS[username]) {
      socket.emit("join_error", "Username not allowed");
      return;
    }

    if (ALLOWED_USERS[username] !== password) {
      socket.emit("join_error", "Wrong password");
      return;
    }

    if ([...users.values()].includes(username)) {
      socket.emit("join_error", "User already logged in");
      return;
    }

    users.set(socket.id, username);

    socket.broadcast.emit("user_joined", username);
    io.emit("users_list", Array.from(users.values()));

    const { rows } = await pool.query(`
      SELECT username, text, created_at
      FROM messages
      ORDER BY created_at ASC
      LIMIT 50
    `);

    socket.emit("message_history", rows);
  });

  socket.on("message", async (msg) => {
    const username = users.get(socket.id);
    if (!username) return;

    const result = await pool.query(
      `INSERT INTO messages (username, text)
       VALUES ($1, $2)
       RETURNING created_at`,
      [username, msg]
    );

    io.emit("message", {
      user: username,
      text: msg,
      time: result.rows[0].created_at
    });
  });

  socket.on("disconnect", () => {
    const username = users.get(socket.id);
    if (!username) return;

    users.delete(socket.id);
    socket.broadcast.emit("user_left", username);
    io.emit("users_list", Array.from(users.values()));
  });
});

// =====================
// Start server
// =====================
const PORT = 3000;

(async () => {
  await initDB();
  server.listen(PORT, () => {
    console.log("Server running on port", PORT);
  });
})();
