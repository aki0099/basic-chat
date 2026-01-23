/* ======================
   PASSWORD SYSTEM
====================== */

const COMMON_PASSWORD = "sharma";

const loginContainer = document.getElementById("login-container");
const joinContainer = document.getElementById("join-container");
const chatContainer = document.getElementById("chat-container");

const loginBtn = document.getElementById("login-btn");
const loginPass = document.getElementById("login-pass");

loginBtn.addEventListener("click", () => {
  if (loginPass.value !== COMMON_PASSWORD) {
    alert("❌ Wrong password");
    return;
  }

  loginContainer.classList.add("hidden");
  joinContainer.classList.remove("hidden");
});
