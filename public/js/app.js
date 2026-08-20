// ===== App Entry Point =====
// Thin bootstrap file that connects all modules together.

import { state } from "./state.js";
import {
  initLobby,
  prefillLobbyFromSession,
  initPresentationToggle,
} from "./views/lobby.js";
import { initHotzone, initNumberButtons } from "./views/hotzone.js";
import { initJeopardy } from "./views/jeopardy.js";
import { initGameOver } from "./views/gameover.js";
import { initAdminPanel } from "./admin.js";
import { registerSocketEvents } from "./socket-handler.js";

// Create socket connection
const socket = io();

// Store socket reference for modules that need it (e.g. number buttons)
window.__gameSocket = socket;

// Register all socket event handlers (consolidated, no duplicates)
registerSocketEvents(socket);

// Initialize all view modules with socket reference
initLobby(socket);
initHotzone(socket);
initJeopardy(socket);
initGameOver(socket);
initAdminPanel(socket);

// DOM Ready initialization
document.addEventListener("DOMContentLoaded", () => {
  initNumberButtons();
  initPresentationToggle();

  // Sync checkbox state (handle browser autofill)
  const checkbox = document.getElementById("presentation-mode");
  if (checkbox && checkbox.checked) {
    state.isPresentation = true;
    document.getElementById("player-name").value = "TV / Presentation";
    document.getElementById("player-name").disabled = true;
  }

  prefillLobbyFromSession();
});

// Handle page visibility change (device sleep/wake)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !socket.connected) {
    socket.connect();
  }
});
