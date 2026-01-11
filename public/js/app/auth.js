import { dom } from "./dom.js";
import { state } from "./state.js";
import { handleRoute } from "./navigation.js";

export function initAuth() {
  dom.loginTab.addEventListener("click", () => {
    dom.loginTab.classList.add("active");
    dom.registerTab.classList.remove("active");
    dom.loginForm.classList.remove("hidden");
    dom.registerForm.classList.add("hidden");
    dom.loginError.textContent = "";
    dom.registerError.textContent = "";
  });

  dom.registerTab.addEventListener("click", () => {
    dom.registerTab.classList.add("active");
    dom.loginTab.classList.remove("active");
    dom.registerForm.classList.remove("hidden");
    dom.loginForm.classList.add("hidden");
    dom.loginError.textContent = "";
    dom.registerError.textContent = "";
  });

  dom.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    dom.loginError.textContent = "";

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        state.currentUser = data.username;
        showApp();
      } else {
        dom.loginError.textContent = data.error || "Login failed";
      }
    } catch (error) {
      console.error("Login error:", error);
      dom.loginError.textContent = "An error occurred. Please try again.";
    }
  });

  dom.registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    dom.registerError.textContent = "";

    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value.trim();

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        state.currentUser = data.username;
        showApp();
      } else {
        dom.registerError.textContent = data.error || "Registration failed";
      }
    } catch (error) {
      console.error("Register error:", error);
      dom.registerError.textContent = "An error occurred. Please try again.";
    }
  });

  dom.logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    }
    showAuth();
  });

  checkAuth();
}

async function checkAuth() {
  try {
    const response = await fetch("/api/auth/check");
    const data = await response.json();
    if (data.authenticated) {
      state.currentUser = data.username;
      showApp();
    } else {
      showAuth();
    }
  } catch (error) {
    console.error("Auth check error:", error);
    showAuth();
  }
}

function showApp() {
  dom.authContainer.classList.add("hidden");
  dom.appContainer.classList.remove("hidden");
  document.body.classList.remove("auth-view");
  dom.usernameDisplay.textContent = state.currentUser || "";
  handleRoute(window.location.pathname, { replace: true });
}

function showAuth() {
  dom.authContainer.classList.remove("hidden");
  dom.appContainer.classList.add("hidden");
  document.body.classList.add("auth-view");
}
