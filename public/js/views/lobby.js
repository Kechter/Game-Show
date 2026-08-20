// ===== Lobby & Waiting Room View =====
// Handles lobby UI, team assignment, waiting room updates.

import { state } from "../state.js";
import {
  showView,
  showToast,
  saveSession,
  getSession,
  clearSession,
} from "../utils.js";

/**
 * Initialize lobby event listeners
 */
export function initLobby(socket) {
  // Presentation mode toggle
  document
    .getElementById("presentation-mode")
    .addEventListener("change", (e) => {
      state.isPresentation = e.target.checked;
      const nameInput = document.getElementById("player-name");
      if (state.isPresentation) {
        nameInput.value = "TV / Presentation";
        nameInput.disabled = true;
      } else {
        nameInput.value = "";
        nameInput.disabled = false;
      }
    });

  // Create room
  document.getElementById("create-room-btn").addEventListener("click", () => {
    state.playerName = document.getElementById("player-name").value.trim();

    if (state.playerName === "TV / Presentation") state.isPresentation = true;

    if (!state.playerName) {
      showToast("Bitte gib deinen Namen ein!", true);
      return;
    }
    socket.emit("createRoom", state.playerName, state.isPresentation);
  });

  // Join room
  document.getElementById("join-room-btn").addEventListener("click", () => {
    state.playerName = document.getElementById("player-name").value.trim();
    const code = document
      .getElementById("room-code")
      .value.trim()
      .toUpperCase();

    if (!state.playerName) {
      showToast("Bitte gib deinen Namen ein!", true);
      return;
    }
    if (!code || code.length !== 4) {
      showToast("Bitte gib einen gültigen Raum-Code ein!", true);
      return;
    }

    if (state.isPresentation || state.playerName === "TV / Presentation") {
      state.isPresentation = true;
      document.body.classList.add("presentation-mode");
    }

    socket.emit("joinRoom", {
      code,
      playerName: state.playerName,
      isPresentation: state.isPresentation,
    });
  });

  // Team assignment buttons
  document.querySelectorAll("[data-team]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const team = parseInt(btn.dataset.team);
      socket.emit("assignTeam", team);
    });
  });

  // Auto-assign teams
  document.getElementById("auto-assign-btn").addEventListener("click", () => {
    socket.emit("autoAssign");
  });

  // Start game
  document.getElementById("start-game-btn").addEventListener("click", () => {
    const gameType = document.getElementById("game-selector").value;
    socket.emit("startGame", gameType);
  });

  // Theme selector change (host only)
  document.getElementById("theme-select").addEventListener("change", (e) => {
    socket.emit("setJeopardyTheme", e.target.value);
  });

  // Game selector change – toggle theme selector + update waiting room UI
  document.getElementById("game-selector").addEventListener("change", (e) => {
    const themeSelector = document.getElementById("jeopardy-theme-selector");
    if (themeSelector) {
      themeSelector.style.display =
        e.target.value === "jeopardy" ? "block" : "none";
    }
    // Update the waiting room to show/hide host-only notice
    if (state.currentRoom) {
      updateWaitingRoom(state.currentRoom);
    }
  });

  // Refresh active rooms
  document
    .getElementById("refresh-rooms-btn")
    ?.addEventListener("click", () => {
      socket.emit("getActiveRooms");
    });

  // Request active rooms on load
  socket.emit("getActiveRooms");
}

/**
 * Update the waiting room UI with current room state
 */
export function updateWaitingRoom(room) {
  const isJeopardy =
    state.currentGameType === "jeopardy" ||
    document.getElementById("game-selector")?.value === "jeopardy";

  // Toggle Teams Container UI
  const teamsContainer = document.querySelector(".teams-container");
  const autoAssignBtn = document.getElementById("auto-assign-btn");
  const unassignedSection = document.querySelector(".unassigned-players");

  if (isJeopardy) {
    // Hide team-join UI – Jeopardy is host-only
    if (teamsContainer) teamsContainer.style.display = "none";
    if (autoAssignBtn) autoAssignBtn.style.display = "none";
    if (unassignedSection) unassignedSection.style.display = "none";

    // Show jeopardy host-only notice
    let hostOnlyNotice = document.getElementById("jeopardy-host-notice");
    if (!hostOnlyNotice) {
      hostOnlyNotice = document.createElement("div");
      hostOnlyNotice.id = "jeopardy-host-notice";
      hostOnlyNotice.className = "jeopardy-host-notice";
      // Insert after teams container or inside waiting view
      const waitingView = document.getElementById("waiting-view");
      if (waitingView && teamsContainer) {
        waitingView.insertBefore(hostOnlyNotice, teamsContainer.nextSibling);
      } else if (waitingView) {
        waitingView.appendChild(hostOnlyNotice);
      }
    }
    hostOnlyNotice.style.display = "block";
    hostOnlyNotice.innerHTML = `
      <div class="host-notice-teams">
        <div class="host-notice-team team-1">
          <span class="team-dot"></span>
          <strong>Team Rot</strong>
        </div>
        <div class="host-notice-vs">VS</div>
        <div class="host-notice-team team-2">
          <span class="team-dot"></span>
          <strong>Team Blau</strong>
        </div>
      </div>
      <p class="host-notice-text">🎮 Host-Modus: Du steuerst das Spiel für beide Teams.<br>Kein Joinen notwendig!</p>
    `;
  } else {
    // Normal Hotzone mode
    if (teamsContainer) teamsContainer.style.display = "grid";
    if (autoAssignBtn) autoAssignBtn.style.display = "inline-flex";
    if (unassignedSection) unassignedSection.style.display = "block";

    const hostOnlyNotice = document.getElementById("jeopardy-host-notice");
    if (hostOnlyNotice) hostOnlyNotice.style.display = "none";

    // Update team displays
    const team1Players = document.getElementById("team-1-players");
    const team2Players = document.getElementById("team-2-players");
    const unassignedList = document.getElementById("unassigned-list");

    if (team1Players) team1Players.innerHTML = "";
    if (team2Players) team2Players.innerHTML = "";
    if (unassignedList) unassignedList.innerHTML = "";

    room.players.forEach((player) => {
      if (player.isPresentation) return;
      const div = document.createElement("div");
      div.className = "player" + (player.id === state.playerId ? " is-you" : "");
      div.textContent =
        player.name +
        (player.id === state.playerId ? " (Du)" : "") +
        (player.isHost ? " 👑" : "");

      if (player.team === 1) {
        team1Players?.appendChild(div);
      } else if (player.team === 2) {
        team2Players?.appendChild(div);
      } else {
        unassignedList?.appendChild(div);
      }
    });
  }

  // Update player counter
  const visiblePlayers = room.players.filter((p) => !p.isPresentation);
  const counter = document.getElementById("player-counter");
  if (counter) {
    counter.textContent = `${visiblePlayers.length} Spieler im Raum`;
  }

  // Show/hide host controls
  document.getElementById("host-controls").style.display = state.isHost
    ? "flex"
    : "none";

  // Show/hide Jeopardy theme selector
  const themeSelector = document.getElementById("jeopardy-theme-selector");
  const gameSelector = document.getElementById("game-selector");
  if (themeSelector && state.isHost) {
    const selectedGame = gameSelector
      ? gameSelector.value
      : state.currentGameType;
    themeSelector.style.display =
      selectedGame === "jeopardy" || isJeopardy ? "block" : "none";
  } else if (themeSelector) {
    themeSelector.style.display = "none";
  }

  // Enable/disable start button
  let canStart = false;
  if (isJeopardy) {
    canStart = room.players.length >= 1; // Host alone is enough
  } else {
    canStart = room.teams[1].length >= 1 && room.teams[2].length >= 1;
  }
  document.getElementById("start-game-btn").disabled = !canStart;
}


/**
 * Try to auto-reconnect from saved session
 */
export function tryReconnect(socket) {
  const session = getSession();
  if (!session) return false;

  state.playerName = session.playerName;
  document.getElementById("player-name").value = state.playerName;

  console.log("Auto-reconnecting to room:", session.roomCode);
  socket.emit("joinRoom", {
    code: session.roomCode,
    playerName: session.playerName,
  });
  return true;
}

/**
 * Pre-fill lobby inputs from saved session
 */
export function prefillLobbyFromSession() {
  const session = getSession();
  if (!session) return;

  if (!state.isPresentation) {
    document.getElementById("room-code").value = session.roomCode || "";
    document.getElementById("player-name").value = session.playerName || "";
  }

  if (session.isPresentation) {
    state.isPresentation = true;
    document.getElementById("presentation-mode").checked = true;
    document.getElementById("player-name").value = "TV / Presentation";
    document.getElementById("player-name").disabled = true;
  }
}

/**
 * Initialize presentation toggle button
 */
export function initPresentationToggle() {
  if (document.getElementById("toggle-presentation-btn")) return;

  const btn = document.createElement("button");
  btn.id = "toggle-presentation-btn";
  btn.textContent = "📺";
  btn.title = "TV Modus umschalten";

  btn.onclick = () => {
    document.body.classList.toggle("presentation-mode");
    state.isPresentation =
      document.body.classList.contains("presentation-mode");
  };

  document.body.appendChild(btn);
}

/**
 * Render the active rooms list in the lobby
 */
export function renderActiveRooms(rooms, socket) {
  const list = document.getElementById("active-rooms-list");
  if (!list) return;

  if (!rooms || rooms.length === 0) {
    list.innerHTML = '<div class="no-rooms">Keine aktiven Räume</div>';
    return;
  }

  const stateLabels = {
    lobby: "Wartet",
    playing: "Im Spiel",
    finished: "Beendet",
  };

  const gameLabels = {
    hotzone: "🔥 Hotzone",
    jeopardy: "🧠 Jeopardy",
  };

  list.innerHTML = rooms
    .map(
      (room) => `
      <div class="active-room-card" data-code="${room.code}">
        <div class="active-room-info">
          <span class="active-room-code">${room.code}</span>
          <span class="active-room-host">${room.hostName}</span>
        </div>
        <div class="active-room-meta">
          <span class="active-room-players">👥 ${room.playerCount}</span>
          <span class="active-room-game">${gameLabels[room.gameType] || "—"}</span>
          <span class="active-room-state state-${room.state}">${stateLabels[room.state] || room.state}</span>
        </div>
        <button class="btn btn-small join-active-room" data-code="${room.code}">Beitreten</button>
      </div>
    `,
    )
    .join("");

  // Add click handlers to join buttons
  list.querySelectorAll(".join-active-room").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.code;
      const playerName = document.getElementById("player-name").value.trim();

      if (!playerName) {
        showToast("Bitte gib deinen Namen ein!", true);
        return;
      }

      state.playerName = playerName;

      if (state.isPresentation || playerName === "TV / Presentation") {
        state.isPresentation = true;
        document.body.classList.add("presentation-mode");
      }

      socket.emit("joinRoom", {
        code,
        playerName: state.playerName,
        isPresentation: state.isPresentation,
      });
    });
  });
}
