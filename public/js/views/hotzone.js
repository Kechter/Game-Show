// ===== Hotzone View =====
// Handles all Hotzone game rendering, clue submission, guessing, results, and timer.

import { state } from "../state.js";
import { showToast } from "../utils.js";

/**
 * Initialize Hotzone event listeners
 */
export function initHotzone(socket) {
  // Submit clue
  document.getElementById("submit-clue-btn").addEventListener("click", () => {
    const clue = document.getElementById("clue-input").value.trim();
    if (!clue) {
      showToast("Bitte gib einen Hinweis ein!", true);
      return;
    }
    socket.emit("submitClue", clue);
    document.getElementById("clue-input").value = "";
  });

  // Submit clue on Enter
  document.getElementById("clue-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      document.getElementById("submit-clue-btn").click();
    }
  });

  // Next turn
  document.getElementById("next-turn-btn").addEventListener("click", () => {
    socket.emit("nextTurn");
  });
}

/**
 * Render the Hotzone game view
 */
export function renderHotzone(gameState) {
  // Update scores
  document.getElementById("score-team-1").textContent = gameState.scores[1];
  document.getElementById("score-team-2").textContent = gameState.scores[2];
  document.getElementById("current-round").textContent = gameState.currentRound;
  document.getElementById("total-rounds").textContent = gameState.totalRounds;

  if (gameState.currentCategory) {
    document.getElementById("category-topic").textContent =
      gameState.currentCategory.topic;
    document.getElementById("scale-left").textContent =
      gameState.currentCategory.scale[0];
    document.getElementById("scale-right").textContent =
      gameState.currentCategory.scale[1];
  }

  const currentPlayer = gameState.players.find((p) => {
    const teamPlayers = gameState.teams[gameState.currentTeam];
    const currentPlayerId =
      teamPlayers[gameState.currentPlayerIndex[gameState.currentTeam]];
    return p.id === currentPlayerId;
  });

  document.getElementById("current-team-indicator").textContent =
    gameState.currentTeam === 1 ? "🔴" : "🔵";
  document.getElementById("current-player-name").textContent =
    currentPlayer?.name || "-";

  // Hide all panels
  document.getElementById("active-player-panel").style.display = "none";
  document.getElementById("waiting-panel").style.display = "none";
  document.getElementById("guessing-panel").style.display = "none";
  document.getElementById("result-panel").style.display = "none";

  const myPlayer = gameState.players.find((p) => p.id === state.playerId);
  const myTeam = myPlayer?.team;
  const isMyTeamsTurn = myTeam === gameState.currentTeam;

  if (gameState.roundPhase === "clue") {
    if (gameState.isActivePlayer) {
      document.getElementById("active-player-panel").style.display = "block";
      document.getElementById("secret-number").textContent =
        gameState.currentNumber;
    } else {
      document.getElementById("waiting-panel").style.display = "block";
      document.getElementById("waiting-text").textContent = isMyTeamsTurn
        ? "Warte auf den Hinweis deines Teammates..."
        : "Das andere Team ist am Zug...";
    }
  } else if (gameState.roundPhase === "guess") {
    document.getElementById("guessing-panel").style.display = "block";
    document.getElementById("clue-display").textContent = gameState.currentClue;

    if (isMyTeamsTurn && !gameState.isActivePlayer) {
      document.getElementById("guess-container").style.display = "block";
      document.getElementById("other-team-waiting").style.display = "none";
      initNumberButtons();
    } else {
      document.getElementById("guess-container").style.display = "none";
      document.getElementById("other-team-waiting").style.display = "block";
    }
  } else if (gameState.roundPhase === "result") {
    document.getElementById("result-panel").style.display = "block";
  }

  // Clue Timer
  const timerEl = document.getElementById("clue-timer");
  if (timerEl) {
    if (gameState.roundPhase === "clue" && gameState.isActivePlayer) {
      timerEl.style.display = "flex";
      startClueTimer();
    } else {
      timerEl.style.display = "none";
      stopClueTimer();
    }
  }
}

/**
 * Initialize the 1-10 number buttons for guessing
 */
export function initNumberButtons() {
  const container = document.getElementById("number-buttons");
  container.innerHTML = "";

  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement("button");
    btn.className = "number-btn";
    btn.textContent = i;
    btn.addEventListener("click", () => {
      // Socket is accessed via the global io() – we emit from the module
      const socket = window.__gameSocket;
      if (socket) socket.emit("submitGuess", i);
    });
    container.appendChild(btn);
  }
}

/**
 * Show the round result panel
 */
export function showRoundResult(result) {
  // Hide other panels
  document.getElementById("active-player-panel").style.display = "none";
  document.getElementById("waiting-panel").style.display = "none";
  document.getElementById("guessing-panel").style.display = "none";

  // Show result panel
  document.getElementById("result-panel").style.display = "block";
  document.getElementById("result-guess").textContent = result.guess;
  document.getElementById("result-actual").textContent = result.actual;

  // Show difference indicator
  const diff = Math.abs(result.guess - result.actual);
  let resultText = "";
  if (diff === 0) {
    resultText = "🎯 PERFEKT!";
  } else if (diff === 1) {
    resultText = "👍 Knapp daneben!";
  } else if (diff === 2) {
    resultText = "😅 Fast...";
  } else {
    resultText = "😬 Weit daneben!";
  }

  const pointsElement = document.getElementById("result-points");
  pointsElement.innerHTML = `${resultText}<br>+${result.points} Punkt${result.points !== 1 ? "e" : ""}`;
  pointsElement.className =
    "result-points" + (result.points === 0 ? " zero" : "");

  // Update scores
  document.getElementById("score-team-1").textContent = result.room.scores[1];
  document.getElementById("score-team-2").textContent = result.room.scores[2];

  // Update current team indicator
  const nextTeam = result.room.currentTeam;
  document.getElementById("current-team-indicator").textContent =
    nextTeam === 1 ? "🔴" : "🔵";

  // Next button
  document.getElementById("next-turn-btn").style.display = "inline-flex";
  document.getElementById("next-turn-btn").disabled = !state.isHost;
  document.getElementById("next-turn-btn").textContent = state.isHost
    ? "Weiter ➡️"
    : "Warte auf Host...";
}

// ===== Clue Timer =====
let clueTimerInterval = null;
let clueTimerSeconds = 30;

function startClueTimer() {
  stopClueTimer();
  clueTimerSeconds = 30;
  const timerText = document.getElementById("timer-text");
  const timerBar = document.getElementById("timer-bar");

  if (timerText) timerText.textContent = "30s";
  if (timerBar) {
    timerBar.style.animation = "none";
    timerBar.offsetHeight; // trigger reflow
    timerBar.style.animation = "";
  }

  clueTimerInterval = setInterval(() => {
    clueTimerSeconds--;
    if (timerText) timerText.textContent = clueTimerSeconds + "s";

    if (clueTimerSeconds <= 0) {
      stopClueTimer();
      if (timerText) timerText.textContent = "0s";
    }
  }, 1000);
}

function stopClueTimer() {
  if (clueTimerInterval) {
    clearInterval(clueTimerInterval);
    clueTimerInterval = null;
  }
}
