// =====================
// Database initialization (PostgreSQL)
// =====================
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
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
// Server initialization
// =====================
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// 🔥 IMPORTANT: POLLING ONLY (Render friendly)
const io = new Server(server, {
  transports: ["polling"],
  allowUpgrades: false,
  cors: { origin: "*" },
  pingInterval: 25000,
  pingTimeout: 60000
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =====================
// FIXED USERS (ID + PASSWORD)
// =====================
const allowedUsers = {
  akhil: "007",
  apoorva: "015",
  aman: "000",
  himanshu: "106"
};

// =====================
// Chat state
// =====================
const users = new Map();
const MAX_USERS = 6;

// =====================
// Socket.IO logic
// =====================
io.on("connection", (socket) => {
  console.log("Connected:", socket.id, "PID:", process.pid);

  socket.on("join", async ({ username, password }) => {
    try {
      // ❌ Not allowed
      if (!allowedUsers[username]) {
        socket.emit("auth_error", "You are not allowed");
        return socket.disconnect();
      }

      // ❌ Wrong password
      if (allowedUsers[username] !== password) {
        socket.emit("auth_error", "Wrong password");
        return socket.disconnect();
      }

      // ❌ Already online
      if ([...users.values()].includes(username)) {
        socket.emit("auth_error", "User already online");
        return socket.disconnect();
      }

      // ❌ Room full
      if (users.size >= MAX_USERS) {
        socket.emit("room_full", "Chat room is full (max 6 users)");
        return socket.disconnect();
      }

      // ✅ SUCCESS
      users.set(socket.id, username);
      console.log("JOIN:", username);

      socket.broadcast.emit("user_joined", username);
      io.emit("users_list", Array.from(users.values()));

      // Send message history
      const { rows } = await pool.query(`
        SELECT username, text, created_at
        FROM messages
        ORDER BY created_at ASC
        LIMIT 50
      `);

      socket.emit("message_history", rows);
    } catch (err) {
      console.error("Join error:", err);
    }
  });

  socket.on("message", async (msg) => {
    const username = users.get(socket.id);
    if (!username) return;

    try {
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
    } catch (err) {
      console.error("Message error:", err);
    }
  });

  socket.on("disconnect", () => {
    const username = users.get(socket.id);
    if (!username) return;

    users.delete(socket.id);
    socket.broadcast.emit("user_left", username);
    io.emit("users_list", Array.from(users.values()));

    console.log("LEFT:", username);
  });
});

// =====================
// Start server AFTER DB
// =====================
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    console.log("Connecting to PostgreSQL...");
    await initDB();

    server.listen(PORT, "0.0.0.0", () => {
      console.log("Server running on port", PORT);
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
})();
