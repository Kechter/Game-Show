// ===== Jeopardy View =====
// Handles all Jeopardy rendering: board, question card, scoreboard.

import { state } from "../state.js";
import { showToast } from "../utils.js";

/**
 * Initialize Jeopardy event listeners
 */
export function initJeopardy(socket) {
  // Board click delegation – Host can always click
  document.getElementById("jeopardy-board").addEventListener("click", (e) => {
    const btn = e.target.closest(".jeopardy-btn");
    if (!btn) return;

    if (
      btn.classList.contains("disabled") ||
      btn.style.cursor === "not-allowed"
    ) {
      return;
    }

    const catIndex = btn.dataset.cat;
    const points = btn.dataset.points;

    if (catIndex !== undefined && points !== undefined) {
      socket.emit("selectQuestion", {
        categoryIndex: parseInt(catIndex),
        points: parseInt(points),
      });
    }
  });

  // Reveal answer
  document.getElementById("reveal-answer-btn").addEventListener("click", () => {
    socket.emit("revealAnswer");
  });

  // Evaluate correct
  document.getElementById("eval-correct").addEventListener("click", () => {
    const card = document.getElementById("jeopardy-card");
    if (card) card.classList.add("eval-success");
    setTimeout(() => {
      if (card) card.classList.remove("eval-success");
      socket.emit("evaluateAnswer", true);
    }, 800);
  });

  // Evaluate wrong
  document.getElementById("eval-wrong").addEventListener("click", () => {
    const card = document.getElementById("jeopardy-card");
    if (card) card.classList.add("eval-error");
    setTimeout(() => {
      if (card) card.classList.remove("eval-error");
      socket.emit("evaluateAnswer", false);
    }, 800);
  });

  // Back to board
  document.getElementById("back-to-board-btn").addEventListener("click", () => {
    if (state.currentRoom?.roundPhase === "question") {
      socket.emit("adminResetRound");
    } else {
      socket.emit("continueToBoard");
    }
  });

  // Team switcher buttons (host-only Jeopardy)
  document.getElementById("switch-team-1-btn")?.addEventListener("click", () => {
    socket.emit("switchActiveTeam", 1);
  });
  document.getElementById("switch-team-2-btn")?.addEventListener("click", () => {
    socket.emit("switchActiveTeam", 2);
  });

  // Host notification for full screen
  if (state.isHost) {
    setTimeout(() => {
      showToast("💡 Tipp: Drücke F11 für Vollbild auf dem Beamer!");
    }, 3000);
  }
}

/**
 * Render the full Jeopardy view based on game state
 */
export function renderJeopardy(gameState) {
  // Update room code display
  const codeToShow =
    gameState.roomCode || state.currentRoomCode || state.currentRoom?.code;
  if (codeToShow) {
    const codeEl = document.getElementById("game-room-code");
    if (codeEl) codeEl.textContent = codeToShow;
  }

  // Always update scoreboard
  renderJeopardyScoreboard(gameState);

  // Host is always "active" (controls everything)
  const isMyTurn = state.isHost || gameState.isMyTurn;

  // ── Team Switcher (host-only) ──
  const teamSwitcher = document.getElementById("jeopardy-team-switcher");
  if (teamSwitcher) {
    if (state.isHost && gameState.roundPhase === "board") {
      teamSwitcher.style.display = "flex";
      // Highlight current active team button
      const btn1 = document.getElementById("switch-team-1-btn");
      const btn2 = document.getElementById("switch-team-2-btn");
      if (btn1) btn1.classList.toggle("active-team", gameState.activeTeamId === 1);
      if (btn2) btn2.classList.toggle("active-team", gameState.activeTeamId === 2);
    } else {
      teamSwitcher.style.display = "none";
    }
  }

  // Turn Banner
  const turnBanner = document.getElementById("jeopardy-turn-banner");
  if (turnBanner) {
    if (state.isHost) {
      const teamColor = gameState.activeTeamId === 1 ? "🔴" : "🔵";
      turnBanner.className = "jeopardy-turn-banner my-turn";
      turnBanner.textContent = `${teamColor} ${gameState.activeTeamName} ist dran – Frage wählen!`;
    } else if (isMyTurn) {
      turnBanner.className = "jeopardy-turn-banner my-turn";
      turnBanner.textContent = "🎯 Euer Team ist dran – wählt eine Frage!";
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } else {
      turnBanner.className = "jeopardy-turn-banner waiting";
      turnBanner.textContent = `⏳ Warte auf ${gameState.activeTeamName}...`;
    }
  }

  // Progress Bar
  const progressText = document.getElementById("jeopardy-progress-text");
  const progressBar = document.getElementById("jeopardy-progress-bar");
  if (progressText && gameState.totalQuestions) {
    progressText.textContent = `${gameState.answeredCount || 0}/${gameState.totalQuestions}`;
    const pct =
      ((gameState.answeredCount || 0) / gameState.totalQuestions) * 100;
    if (progressBar) progressBar.style.width = pct + "%";
  }

  const board = document.getElementById("jeopardy-board");
  const card = document.getElementById("jeopardy-card");

  // Toggle Board vs Card
  if (gameState.roundPhase === "board") {
    document.body.classList.add("jeopardy-mode");
    board.style.display = "grid";
    board.style.opacity = "1";
    if (card) card.style.display = "none";

    if (gameState.categories) {
      renderJeopardyBoard(gameState, isMyTurn);
    }
  } else {
    document.body.classList.remove("jeopardy-mode");
    board.style.display = "none";
    if (card) card.style.display = "flex";

    if (state.isPresentation) {
      document.body.classList.add("jeopardy-mode");
      board.style.display = "grid";
      board.style.opacity = "0.3";
      renderJeopardyBoard(gameState, false);
    }

    const q = gameState.currentQuestion;
    if (q) {
      document.getElementById("jeopardy-category-label").textContent = q.categoryName;
      document.getElementById("jeopardy-points-label").textContent = q.points;
      document.getElementById("jeopardy-active-player-name").textContent =
        gameState.activeTeamName || "-";

      const qText = document.getElementById("jeopardy-question-text");
      const answerContainer = document.getElementById("evaluation-controls");
      const answerText = document.getElementById("jeopardy-answer-text");
      const revealBtn = document.getElementById("reveal-answer-btn");
      const backToBoardBtn = document.getElementById("back-to-board-btn");
      const actions = document.getElementById("jeopardy-actions");
      const evalButtons = document.getElementById("eval-buttons");

      // Host always can control; others only if on active team
      const canControl = state.isHost || isMyTurn;
      const hasTV = gameState.hasPresentationPlayer;

      if (
        gameState.roundPhase === "question" ||
        gameState.roundPhase === "answer"
      ) {
        if (qText) qText.textContent = q.q;

        const optionsGrid = document.getElementById("jeopardy-options-grid");
        if (q.options && optionsGrid) {
          optionsGrid.style.display = "grid";
          optionsGrid.innerHTML = "";
          q.options.forEach((opt, index) => {
            const optEl = document.createElement("div");
            optEl.className = "jeopardy-option";

            if (gameState.roundPhase === "answer") {
              if (opt === q.a) {
                optEl.classList.add("correct-option");
              } else {
                optEl.classList.add("wrong-option");
              }
            }

            optEl.innerHTML = `<span class="option-letter">${["A", "B", "C", "D"][index]}</span> ${opt}`;
            optionsGrid.appendChild(optEl);
          });
        } else if (optionsGrid) {
          optionsGrid.style.display = "none";
        }
      }

      if (gameState.roundPhase === "question") {
        if (answerContainer) answerContainer.style.display = "none";

        if (state.isPresentation) {
          if (revealBtn) revealBtn.style.display = "none";
          if (backToBoardBtn) backToBoardBtn.style.display = "none";
        } else {
          if (revealBtn)
            revealBtn.style.display = canControl ? "inline-block" : "none";
          if (backToBoardBtn)
            backToBoardBtn.style.display = state.isHost ? "inline-block" : "none";
        }
      } else if (gameState.roundPhase === "answer") {
        if (answerText) answerText.textContent = q.a;
        if (revealBtn) revealBtn.style.display = "none";
        if (backToBoardBtn) backToBoardBtn.style.display = "none";

        if (state.isPresentation) {
          if (answerContainer)
            answerContainer.style.display = q.options ? "none" : "block";
          if (evalButtons) evalButtons.style.display = "none";
        } else {
          if (answerContainer) answerContainer.style.display = "block";
          if (answerText)
            answerText.style.display = q.options ? "none" : "block";
          if (evalButtons)
            evalButtons.style.display = canControl ? "flex" : "none";
          const evalCorrectBtn = document.getElementById("eval-correct");
          const evalWrongBtn = document.getElementById("eval-wrong");
          const pts = parseInt(q.points, 10) || 0;
          if (evalCorrectBtn) evalCorrectBtn.textContent = `✅ Richtig (+${pts})`;
          if (evalWrongBtn) evalWrongBtn.textContent = `❌ Falsch (-${Math.floor(pts / 2)})`;
        }
      }

      if (actions) actions.style.display = "block";
    }
  }
}

/**
 * Render the Jeopardy scoreboard
 */
export function renderJeopardyScoreboard(gameState) {
  const scoreboard = document.getElementById("jeopardy-scoreboard");
  if (!scoreboard || !gameState.scores) return;

  const score1 = gameState.scores[1] || 0;
  const score2 = gameState.scores[2] || 0;

  scoreboard.innerHTML = `
    <div class="jeopardy-score ${gameState.activeTeamId === 1 ? "active" : ""} team-1-score">
      <span class="jeopardy-score-name">🔴 Team Rot</span>
      <span class="jeopardy-score-val">${score1}</span>
    </div>
    <div class="jeopardy-score ${gameState.activeTeamId === 2 ? "active" : ""} team-2-score">
      <span class="jeopardy-score-name">🔵 Team Blau</span>
      <span class="jeopardy-score-val">${score2}</span>
    </div>
  `;
}

/**
 * Render the Jeopardy game board grid
 */
export function renderJeopardyBoard(gameState, isMyTurn) {
  const board = document.getElementById("jeopardy-board");
  board.innerHTML = "";
  board.style.gridTemplateColumns = `repeat(${gameState.categories.length}, 1fr)`;

  gameState.categories.forEach((cat, catIndex) => {
    const col = document.createElement("div");
    col.className = "jeopardy-col";

    // Header
    const header = document.createElement("div");
    header.className = "jeopardy-cat-header";
    header.textContent = cat.name;
    col.appendChild(header);

    // Questions
    const points = [100, 200, 300, 400, 500];
    points.forEach((p) => {
      const btn = document.createElement("div");
      btn.className = "jeopardy-btn";

      const answeredQuestionsForCat =
        gameState.answeredQuestions[cat.name] || [];
      const answeredObj = answeredQuestionsForCat.find((q) => q.points === p);

      if (answeredObj) {
        btn.classList.add("disabled");
        btn.classList.add(
          `team-${answeredObj.teamId}-${answeredObj.correct ? "correct" : "wrong"}`
        );
        btn.textContent = p;
      } else {
        btn.textContent = p;

        if (!state.isPresentation) {
          // Host can always click; regular players only on their turn
          if (state.isHost || isMyTurn) {
            btn.style.cursor = "pointer";
            btn.dataset.cat = catIndex;
            btn.dataset.points = p;
          } else {
            btn.style.cursor = "not-allowed";
          }
        }
      }

      col.appendChild(btn);
    });

    board.appendChild(col);
  });
}
