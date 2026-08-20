// ===== Socket Event Handler =====
// All socket.on() listeners consolidated here. No duplicates.

import { state } from "./state.js";
import { showView, showToast, saveSession, clearSession } from "./utils.js";
import {
  updateWaitingRoom,
  tryReconnect,
  renderActiveRooms,
} from "./views/lobby.js";
import { renderHotzone, showRoundResult } from "./views/hotzone.js";
import { renderJeopardy } from "./views/jeopardy.js";
import { showGameOver } from "./views/gameover.js";
import {
  showRoomControls,
  hideAdminControls,
  updateAdminPlayerList,
} from "./admin.js";

/**
 * Register all socket event listeners (called once on init)
 */
export function registerSocketEvents(socket) {
  // ===== Connection =====
  socket.on("connect", () => {
    state.playerId = socket.id;
    tryReconnect(socket);
  });

  socket.on("disconnect", () => {
    showToast("Verbindung verloren...", true);
  });

  // ===== Active Rooms =====
  socket.on("activeRooms", (rooms) => {
    renderActiveRooms(rooms, socket);
  });

  // ===== Room Events =====
  socket.on("roomCreated", (room) => {
    state.currentRoom = room;
    state.currentRoomCode = room.code;
    state.isHost = true;

    document.getElementById("display-room-code").textContent = room.code;
    updateWaitingRoom(room);
    showView("waiting");
    saveSession();
    showToast("Raum erstellt! Teile den Code mit deinen Freunden.");
    showRoomControls();

    // Load Jeopardy themes
    socket.emit("getJeopardyThemes");
  });

  socket.on("roomJoined", (room) => {
    state.currentRoom = room;
    state.currentRoomCode = room.code;
    state.isHost =
      room.players.find((p) => p.id === state.playerId)?.isHost || false;
    state.currentGameType = room.gameType || "hotzone";

    document.getElementById("display-room-code").textContent = room.code;
    updateWaitingRoom(room);
    showView("waiting");
    saveSession();
    showRoomControls();
  });

  socket.on("midGameJoin", (data) => {
    if (data.needsTeam) {
      showToast("Spiel läuft bereits! Wähle schnell ein Team 🏃‍♂️");
      if (state.currentRoom) {
        updateWaitingRoom(state.currentRoom);
        showView("waiting");
      }
    }
  });

  socket.on("playerUpdate", (room) => {
    const wasHost = state.isHost;
    state.currentRoom = room;
    state.isHost =
      room.players.find((p) => p.id === state.playerId)?.isHost || false;
    saveSession();

    // Update admin controls visibility whenever host status changes
    showRoomControls();

    // Notify new admin
    if (!wasHost && state.isHost) {
      showToast("Du bist jetzt der Admin! ⚙️");
    }

    if (
      room.state === "lobby" ||
      document.getElementById("waiting-view").classList.contains("active")
    ) {
      updateWaitingRoom(room);
      if (room.state === "lobby") {
        showView("waiting");
      }
    }
  });

  // ===== Game State =====
  socket.on("gameState", (gameState) => {
    state.currentRoom = gameState;

    // Update game type
    if (gameState.type && gameState.type !== state.currentGameType) {
      state.currentGameType = gameState.type;
    }

    // Route to correct renderer
    const hotzoneUI = document.getElementById("hotzone-interface");
    const jeopardyUI = document.getElementById("jeopardy-interface");

    if (state.currentGameType === "jeopardy") {
      hotzoneUI.style.display = "none";
      jeopardyUI.style.display = "block";
      document.querySelector(".game-header").style.display = "none";
      document.querySelector(".current-turn-info").style.display = "none";
      renderJeopardy(gameState);
    } else {
      hotzoneUI.style.display = "block";
      jeopardyUI.style.display = "none";
      document.querySelector(".game-header").style.display = "block";
      document.querySelector(".current-turn-info").style.display = "block";
      renderHotzone(gameState);
    }

    showView("game");
    saveSession();

    // Update admin panel
    updateAdminPlayerList(gameState.players || []);

    // Toggle admin sections based on game type
    const turnSection = document.getElementById("admin-turn-section");
    if (turnSection) {
      turnSection.style.display =
        gameState.type === "jeopardy" ? "block" : "none";
    }

    const hotzoneSection = document.getElementById("admin-hotzone-section");
    if (hotzoneSection) {
      hotzoneSection.style.display =
        gameState.type === "hotzone" ? "block" : "none";
    }
  });

  socket.on("roundResult", (result) => {
    showRoundResult(result);
  });

  socket.on("gameFinished", (room) => {
    showGameOver(room);
    clearSession();
  });

  // ===== Error & Admin Notifications =====
  socket.on("error", (message) => {
    showToast(message, true);
  });

  socket.on("kicked", () => {
    showToast("Du wurdest vom Admin entfernt", true);
    clearSession();
    state.currentRoom = null;
    state.currentRoomCode = null;
    hideAdminControls();
    showView("lobby");
  });

  // ===== Jeopardy Themes =====
  socket.on("jeopardyThemes", (themes) => {
    const select = document.getElementById("theme-select");
    if (!select) return;
    select.innerHTML = "";
    themes.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.label} (${t.categoryCount} Kategorien)`;
      select.appendChild(opt);
    });
  });

  socket.on("themeChanged", (themeId) => {
    const select = document.getElementById("theme-select");
    if (select) select.value = themeId;
    showToast(`Thema geändert!`);
  });

  // ===== Rejoin Support =====
  socket.on("rejoinSuccess", ({ room, gameState }) => {
    state.currentRoom = room;
    state.currentRoomCode = room.code;
    state.isHost =
      room.players.find((p) => p.id === state.playerId)?.isHost || false;
    saveSession();
    showRoomControls();

    if (gameState) {
      // Route to game view
      state.currentGameType = gameState.type || "hotzone";

      const hotzoneUI = document.getElementById("hotzone-interface");
      const jeopardyUI = document.getElementById("jeopardy-interface");

      if (state.currentGameType === "jeopardy") {
        hotzoneUI.style.display = "none";
        jeopardyUI.style.display = "block";
        document.querySelector(".game-header").style.display = "none";
        document.querySelector(".current-turn-info").style.display = "none";
        renderJeopardy(gameState);
      } else {
        hotzoneUI.style.display = "block";
        jeopardyUI.style.display = "none";
        document.querySelector(".game-header").style.display = "block";
        document.querySelector(".current-turn-info").style.display = "block";
        renderHotzone(gameState);
      }

      showView("game");
    } else {
      updateWaitingRoom(room);
      showView("waiting");
    }
  });

  socket.on("rejoinFailed", () => {
    clearSession();
    showView("lobby");
  });

  // ===== Game Over (from admin) =====
  socket.on("gameOver", (result) => {
    // Admin-triggered game end
    if (state.currentRoom) {
      showGameOver(state.currentRoom);
    }
  });
}
