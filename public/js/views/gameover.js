// ===== Game Over View =====
// Handles the game over screen and confetti animation.

import { state } from "../state.js";
import { showView, showToast } from "../utils.js";

/**
 * Initialize game over event listeners
 */
export function initGameOver(socket) {
  document.getElementById("play-again-btn").addEventListener("click", () => {
    socket.emit("restartGame");
  });
}

/**
 * Show the game over screen with final scores
 */
export function showGameOver(room) {
  document.body.classList.remove("jeopardy-mode");

  if (state.currentGameType === "jeopardy") {
    // ── Jeopardy: Team-based scores (scores[1] and scores[2]) ──
    const score1 = room.scores?.[1] ?? 0;
    const score2 = room.scores?.[2] ?? 0;

    // Determine winner
    let winnerText;
    if (score1 > score2) {
      winnerText = "🔴 Team Rot gewinnt!";
    } else if (score2 > score1) {
      winnerText = "🔵 Team Blau gewinnt!";
    } else {
      winnerText = "🤝 Unentschieden!";
    }
    document.getElementById("winner-title").textContent = winnerText;

    // Show large team score blocks
    const finalScoresEl = document.querySelector(".final-scores");
    if (finalScoresEl) finalScoresEl.style.display = "flex";

    document.getElementById("final-score-1").textContent = score1;
    document.getElementById("final-score-2").textContent = score2;

    // Remove any leftover jeopardy-specific detail list
    const oldDetails = document.getElementById("jeopardy-final-details");
    if (oldDetails) oldDetails.remove();

    // Add point suffix for clarity
    const t1Label = document.querySelector(".team-1-final .team-name");
    const t2Label = document.querySelector(".team-2-final .team-name");
    if (t1Label) t1Label.textContent = "🔴 Team Rot";
    if (t2Label) t2Label.textContent = "🔵 Team Blau";

  } else {
    // ── Hotzone: Team scores ──
    document.querySelector(".final-scores").style.display = "flex";
    const score1 = room.scores?.[1] ?? 0;
    const score2 = room.scores?.[2] ?? 0;

    document.getElementById("final-score-1").textContent = score1;
    document.getElementById("final-score-2").textContent = score2;

    let winnerText = "🏆 ";
    if (score1 > score2) {
      winnerText += "Team Rot gewinnt!";
    } else if (score2 > score1) {
      winnerText += "Team Blau gewinnt!";
    } else {
      winnerText = "🤝 Unentschieden!";
    }
    document.getElementById("winner-title").textContent = winnerText;

    // Hide jeopardy details if present
    const details = document.getElementById("jeopardy-final-details");
    if (details) details.remove();
  }

  showView("gameover");
  launchConfetti();
}

/**
 * Confetti particle animation on the canvas
 */
function launchConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = [
    "#ff4444",
    "#4488ff",
    "#ff6b35",
    "#44ff88",
    "#ffbb33",
    "#ff44aa",
    "#44ddff",
  ];

  for (let i = 0; i < 200; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 12 + 5,
      h: Math.random() * 7 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 4 + 2,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    });
  }

  let frame = 0;
  const maxFrames = 220;

  function animate() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.rot += p.rotSpeed;
      if (frame > maxFrames - 60) {
        p.opacity = Math.max(0, p.opacity - 0.017);
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (frame < maxFrames) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  animate();
}
