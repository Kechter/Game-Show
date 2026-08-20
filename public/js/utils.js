// ===== Shared Utilities =====
// View management, toasts, and session persistence.

import { state } from "./state.js";

// DOM view references
const views = {
  lobby: document.getElementById("lobby-view"),
  waiting: document.getElementById("waiting-view"),
  game: document.getElementById("game-view"),
  gameover: document.getElementById("gameover-view"),
};

/**
 * Switch the active view
 */
export function showView(viewName) {
  Object.values(views).forEach((v) => v.classList.remove("active"));
  views[viewName].classList.add("active");
}

/**
 * Show a temporary toast notification
 */
export function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ===== Session Persistence =====

export function saveSession() {
  if (state.currentRoom && state.playerName) {
    const session = {
      roomCode: state.currentRoom.code,
      playerName: state.playerName,
      isPresentation: state.isPresentation,
      timestamp: Date.now(),
    };
    localStorage.setItem("hotzone_session", JSON.stringify(session));
  }
}

export function clearSession() {
  localStorage.removeItem("hotzone_session");
}

export function getSession() {
  const stored = localStorage.getItem("hotzone_session");
  if (!stored) return null;

  try {
    const session = JSON.parse(stored);
    // Session expires after 2 hours
    if (Date.now() - session.timestamp > 2 * 60 * 60 * 1000) {
      clearSession();
      return null;
    }
    return session;
  } catch (e) {
    clearSession();
    return null;
  }
}
