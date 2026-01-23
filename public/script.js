const socket = io({
  transports: ["websocket"]
});

// ======================
// ELEMENTS
// ======================
const joinContainer = document.getElementById("join-container");
const chatContainer = document.getElementById("chat-container");

const joinBtn = document.getElementById("join-btn");
const sendBtn = document.getElementById("send-btn");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const messageInput = document.getElementById("message-input");

const messagesDiv = document.getElementById("messages");
const usersDiv = document.getElementById("users");
const joinError = document.getElementById("join-error");

// ======================
// JOIN CHAT
// ======================
joinBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    joinError.textContent = "Username & password required";
    return;
  }

  socket.emit("join", { username, password });
});

// ======================
// SERVER RESPONSES
// ======================
socket.on("auth_error", msg => {
  joinError.textContent = "❌ " + msg;
});

socket.on("room_full", msg => {
  joinError.textContent = msg;
});

socket.on("message_history", () => {
  // ✅ LOGIN SUCCESS → OPEN CHAT
  joinContainer.classList.add("hidden");
  chatContainer.classList.remove("hidden");
});

// ======================
// SEND MESSAGE
// ======================
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const msg = messageInput.value.trim();
  if (!msg) return;

  socket.emit("message", msg);
  messageInput.value = "";
}

// ======================
// RECEIVE EVENTS
// ======================
socket.on("message", data => {
  addMessage(`${data.user}: ${data.text}`);
});

socket.on("user_joined", username => {
  addSystemMessage(`${username} joined`);
});

socket.on("user_left", username => {
  addSystemMessage(`${username} left`);
});

socket.on("users_list", users => {
  usersDiv.textContent = `Users (${users.length}/6): ${users.join(", ")}`;
});

// ======================
// HELPERS
// ======================
function addMessage(text) {
  const div = document.createElement("div");
  div.className = "message";
  div.textContent = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addSystemMessage(text) {
  const div = document.createElement("div");
  div.className = "message system";
  div.textContent = text;
  messagesDiv.appendChild(div);
}
