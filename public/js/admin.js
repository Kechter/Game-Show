// ===== Admin Panel =====
// Admin controls: kick, adjust score, skip turn, reset round, end game, leave room.

import { state } from "./state.js";
import { showView, clearSession } from "./utils.js";

/**
 * Initialize admin panel event listeners
 */
export function initAdminPanel(socket) {
  const toggleBtn = document.getElementById("admin-toggle-btn");
  const closeBtn = document.getElementById("admin-close-btn");
  const panel = document.getElementById("admin-panel");
  const leaveBtn = document.getElementById("leave-room-btn");

  toggleBtn?.addEventListener("click", () => {
    panel.classList.toggle("open");
  });

  closeBtn?.addEventListener("click", () => {
    panel.classList.remove("open");
  });

  // Leave Room
  leaveBtn?.addEventListener("click", () => {
    if (confirm("Raum wirklich verlassen?")) {
      socket.emit("leaveRoom");
      clearSession();
      state.currentRoom = null;
      state.currentRoomCode = null;
      showView("lobby");
      hideAdminControls();
    }
  });

  // Skip Turn
  document.getElementById("admin-skip-turn")?.addEventListener("click", () => {
    socket.emit("adminSkipTurn");
  });

  // Reset Round
  document
    .getElementById("admin-reset-round")
    ?.addEventListener("click", () => {
      socket.emit("adminResetRound");
    });

  // End Game
  document.getElementById("admin-end-game")?.addEventListener("click", () => {
    if (confirm("Spiel wirklich beenden?")) {
      socket.emit("adminEndGame");
    }
  });

  // Expose admin actions globally for inline onclick handlers in admin player list
  window.adminKick = (targetId) => {
    if (confirm("Spieler wirklich entfernen?")) {
      socket.emit("adminKick", targetId);
    }
  };

  window.adminAdjustScore = (targetId, amount) => {
    socket.emit("adminAdjustScore", { targetId, amount });
  };

  window.adminSetActive = (targetId) => {
    socket.emit("adminSetActive", targetId);
  };
}

/**
 * Show room controls (leave button, admin toggle)
 */
export function showRoomControls() {
  const leaveBtn = document.getElementById("leave-room-btn");
  if (leaveBtn) leaveBtn.style.display = "flex";

  const toggleBtn = document.getElementById("admin-toggle-btn");
  const panel = document.getElementById("admin-panel");

  if (state.isHost || state.isPresentation) {
    if (toggleBtn) toggleBtn.style.display = "flex";
  } else {
    // Not admin: hide admin controls
    if (toggleBtn) toggleBtn.style.display = "none";
    if (panel) panel.classList.remove("open");
  }
}

/**
 * Hide admin controls
 */
export function hideAdminControls() {
  const toggleBtn = document.getElementById("admin-toggle-btn");
  const leaveBtn = document.getElementById("leave-room-btn");
  const panel = document.getElementById("admin-panel");
  if (toggleBtn) toggleBtn.style.display = "none";
  if (leaveBtn) leaveBtn.style.display = "none";
  if (panel) panel.classList.remove("open");
}

/**
 * Update the admin player list with current players
 */
export function updateAdminPlayerList(players) {
  const list = document.getElementById("admin-player-list");
  if (!list) return;

  list.innerHTML = players
    .filter((p) => !p.isPresentation)
    .map(
      (p) => `
      <div class="admin-player-item">
        <div class="admin-player-info">
          <div class="admin-player-status ${p.isConnected === false ? "offline" : ""}"></div>
          <span class="admin-player-name">${p.name}</span>
          <span class="admin-player-score">(${p.score || 0})</span>
        </div>
        <div class="admin-player-actions">
          <button onclick="adminAdjustScore('${p.id}', 100)">+100</button>
          <button onclick="adminAdjustScore('${p.id}', -100)">-100</button>
          <button onclick="adminSetActive('${p.id}')">▶️</button>
          <button onclick="adminKick('${p.id}')">❌</button>
        </div>
      </div>
    `,
    )
    .join("");
}
