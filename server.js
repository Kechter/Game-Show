const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const os = require("os");
const GameManager = require("./game/GameManager");
const JeopardyGame = require("./game/games/Jeopardy");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const gameManager = new GameManager();

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Get all local IP addresses
function getAllIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips.length > 0 ? ips : [{ name: "Local", address: "localhost" }];
}

// ===== Helpers (top-level, not per-connection) =====

/**
 * Sanitize room object for client (removes gameInstance and deep-copies)
 */
function sanitizeRoom(room) {
  // Include real game scores: for Jeopardy these live in gameInstance.state.scores
  const gameScores = (room.gameInstance && room.gameInstance.state && room.gameInstance.state.scores)
    ? { ...room.gameInstance.state.scores }
    : { ...(room.scores || {}) };

  return {
    code: room.code,
    hostId: room.hostId,
    players: room.players.map((p) => ({ ...p })),
    teams: {
      1: [...(room.teams[1] || [])],
      2: [...(room.teams[2] || [])],
    },
    state: room.state,
    gameType: room.gameType,
    scores: gameScores,
  };
}


/**
 * Send safe player update to all players in a room
 */
function emitPlayerUpdate(room) {
  if (!room) return;
  try {
    const safeRoom = {
      code: room.code,
      hostId: room.hostId,
      players: room.players,
      teams: room.teams,
      state: room.state,
      gameType: room.gameType,
      scores: room.scores,
    };
    io.to(room.code).emit("playerUpdate", safeRoom);
  } catch (e) {
    console.error("Error emitting playerUpdate:", e);
  }
}

/**
 * Send personalized game state to all players in a room
 */
function sendGameStateToAll(code) {
  const room = gameManager.getRoom(code);
  if (!room) return;

  room.players.forEach((player) => {
    const playerSocket = io.sockets.sockets.get(player.id);
    if (playerSocket) {
      const state = gameManager.getPlayerState(code, player.id);
      playerSocket.emit("gameState", state);
    }
  });
}

// ===== Socket.io Connection Handling =====
io.on("connection", (socket) => {
  console.log(`Spieler verbunden: ${socket.id}`);
  let currentRoom = null;

  // --- Active Rooms ---
  socket.on("getActiveRooms", () => {
    socket.emit("activeRooms", gameManager.getActiveRooms());
  });

  // --- Room Management ---

  socket.on("createRoom", (playerName, isPresentation) => {
    const room = gameManager.createRoom(socket.id, playerName, isPresentation);
    currentRoom = room.code;
    socket.join(room.code);
    socket.emit("roomCreated", sanitizeRoom(room));
    console.log(
      `Raum erstellt: ${room.code} von ${playerName} (Presentation: ${isPresentation})`,
    );
  });

  socket.on("joinRoom", ({ code, playerName, isPresentation }) => {
    console.log(`Join attempt: ${playerName} -> ${code}`);
    const result = gameManager.joinRoom(
      code,
      socket.id,
      playerName,
      isPresentation,
    );
    if (result.error) {
      socket.emit("error", result.error);
      console.log(`Join failed: ${result.error}`);
      return;
    }

    currentRoom = code.toUpperCase();
    socket.join(currentRoom);

    const room = result.room;

    if (result.reconnected) {
      console.log(`${playerName} reconnected to Raum ${currentRoom}`);
      if (room.state === "playing") {
        const state = gameManager.getPlayerState(currentRoom, socket.id);
        socket.emit("gameState", state);
      } else if (room.state === "lobby") {
        socket.emit("roomJoined", sanitizeRoom(room));
      }
    } else if (result.gameInProgress) {
      console.log(`${playerName} joined mid-game in Raum ${currentRoom}`);
      if (room.gameType === "jeopardy") {
        const state = gameManager.getPlayerState(currentRoom, socket.id);
        socket.emit("gameState", state);
      } else {
        socket.emit("roomJoined", sanitizeRoom(room));
        socket.emit("midGameJoin", { needsTeam: true });
      }
    } else {
      console.log(`${playerName} trat Raum ${currentRoom} bei`);
      socket.emit("roomJoined", sanitizeRoom(room));
    }

    emitPlayerUpdate(room);
  });

  socket.on("rejoinRoom", ({ code, playerName }) => {
    console.log(`Rejoin attempt: ${playerName} -> ${code}`);
    const room = gameManager.getRoom(code);

    if (!room) {
      socket.emit("rejoinFailed");
      return;
    }

    const existingPlayer = room.players.find((p) => p.name === playerName);

    if (existingPlayer) {
      const oldId = existingPlayer.id;
      existingPlayer.id = socket.id;

      for (const team of [1, 2]) {
        const idx = room.teams[team].indexOf(oldId);
        if (idx !== -1) {
          room.teams[team][idx] = socket.id;
        }
      }

      if (room.hostId === oldId) {
        room.hostId = socket.id;
      }
    } else {
      const joinResult = gameManager.joinRoom(code, socket.id, playerName);
      if (joinResult.error) {
        socket.emit("rejoinFailed");
        return;
      }
    }

    currentRoom = code.toUpperCase();
    socket.join(currentRoom);

    const state = gameManager.getPlayerState(code, socket.id);
    socket.emit("rejoinSuccess", { room: sanitizeRoom(room), state });
    emitPlayerUpdate(room);
    console.log(`${playerName} rejoined Raum ${currentRoom}`);
  });

  // --- Team Management ---

  socket.on("assignTeam", (team) => {
    if (!currentRoom) return;
    const room = gameManager.assignTeam(currentRoom, socket.id, team);
    if (room) {
      emitPlayerUpdate(room);
      if (room.state === "playing") {
        const state = gameManager.getPlayerState(currentRoom, socket.id);
        socket.emit("gameState", state);
      }
    }
  });

  socket.on("autoAssign", () => {
    if (!currentRoom) return;
    const room = gameManager.autoAssignTeams(currentRoom);
    if (room) {
      emitPlayerUpdate(room);
    }
  });

  // --- Game Flow ---

  socket.on("startGame", (payload = "hotzone") => {
    if (!currentRoom) return;
    const gameType =
      typeof payload === "object" && payload !== null
        ? payload.gameType || "hotzone"
        : payload;
    const requestedTheme =
      typeof payload === "object" && payload !== null
        ? payload.theme
        : undefined;
    const room = gameManager.getRoom(currentRoom);
    const options = {};
    if (gameType === "jeopardy" && room) {
      options.theme = requestedTheme || room.jeopardyTheme || "allgemein";
    }
    const result = gameManager.startGame(currentRoom, gameType, options);
    if (result.error) {
      socket.emit("error", result.error);
      return;
    }
    sendGameStateToAll(currentRoom);
  });

  socket.on("restartGame", () => {
    if (!currentRoom) return;
    const room = gameManager.restartGame(currentRoom);
    if (room) {
      emitPlayerUpdate(room);
    }
  });

  // --- Jeopardy Theme ---

  socket.on("getJeopardyThemes", () => {
    socket.emit("jeopardyThemes", JeopardyGame.getAvailableThemes());
  });

  socket.on("setJeopardyTheme", (themeId) => {
    if (!currentRoom) return;
    const result = gameManager.setJeopardyTheme(
      currentRoom,
      socket.id,
      themeId,
    );
    if (result.error) {
      socket.emit("error", result.error);
      return;
    }
    io.to(currentRoom).emit("themeChanged", result.themeId);
    console.log(`Jeopardy Theme für ${currentRoom}: ${result.themeId}`);
  });

  // --- Jeopardy Question History ---

  // Admin: History für ein Theme (oder alle) zurücksetzen
  socket.on("resetJeopardyHistory", (themeId) => {
    if (!currentRoom) return;
    const room = gameManager.rooms[currentRoom];
    const player = room?.players.find(p => p.id === socket.id);
    if (!player?.isHost) { socket.emit("error", "Nur der Host kann die History zurücksetzen."); return; }
    JeopardyGame.resetHistory(themeId || null); // null = alles zurücksetzen
    socket.emit("jeopardyHistoryReset", { theme: themeId || "alle" });
    console.log(`[History] Zurückgesetzt von Host (Theme: ${themeId || "alle"})`);
  });

  // Admin: aktuelle History abrufen (für Debug/Anzeige)
  socket.on("getJeopardyHistory", () => {
    socket.emit("jeopardyHistory", JeopardyGame.getHistory());
  });

  // --- Hotzone Actions ---

  socket.on("submitClue", (clue) => {
    if (!currentRoom) return;
    const result = gameManager.submitClue(currentRoom, socket.id, clue);
    if (result.error) {
      socket.emit("error", result.error);
      return;
    }
    sendGameStateToAll(currentRoom);
  });

  socket.on("submitGuess", (guess) => {
    if (!currentRoom) return;
    const result = gameManager.submitGuess(currentRoom, parseInt(guess));
    if (result.error) {
      socket.emit("error", result.error);
      return;
    }
    if (result.room) {
      result.room = sanitizeRoom(result.room);
    }
    io.to(currentRoom).emit("roundResult", result);
    sendGameStateToAll(currentRoom);
  });

  socket.on("nextTurn", () => {
    if (!currentRoom) return;
    const result = gameManager.nextTurn(currentRoom);
    if (result.error) {
      socket.emit("error", result.error);
      return;
    }
    if (result.finished) {
      io.to(currentRoom).emit("gameFinished", sanitizeRoom(result.room));
    } else {
      sendGameStateToAll(currentRoom);
    }
  });

  // --- Jeopardy Actions ---

  socket.on("selectQuestion", ({ categoryIndex, points }) => {
    if (!currentRoom) return;
    const result = gameManager.selectQuestion(
      currentRoom,
      socket.id,
      categoryIndex,
      points,
    );
    if (result.error) {
      socket.emit("error", result.error);
      return;
    }
    emitPlayerUpdate(result.room);
    sendGameStateToAll(currentRoom);
  });

  socket.on("revealAnswer", () => {
    if (!currentRoom) return;
    const result = gameManager.revealAnswer(currentRoom, socket.id);
    if (result.error) {
      socket.emit("error", result.error);
      return;
    }
    emitPlayerUpdate(result.room);
    sendGameStateToAll(currentRoom);
  });

  socket.on("evaluateAnswer", (isCorrect) => {
    if (!currentRoom) return;
    const result = gameManager.evaluateAnswer(
      currentRoom,
      socket.id,
      isCorrect,
    );
    if (result.error) {
      socket.emit("error", result.error);
      return;
    }

    if (result.allAnswered) {
      const room = gameManager.getRoom(currentRoom);
      if (room) {
        room.state = "finished";
        emitPlayerUpdate(room);
        io.to(currentRoom).emit("gameFinished", sanitizeRoom(room));
        return;
      }
    }

    emitPlayerUpdate(result.room);
    sendGameStateToAll(currentRoom);
  });

  socket.on("submitMultipleChoice", (selectedOption) => {
    if (!currentRoom) return;
    const result = gameManager.submitMultipleChoice(currentRoom, socket.id, selectedOption);
    if (result.error) {
      socket.emit("error", result.error);
      return;
    }
    emitPlayerUpdate(result.room);
    sendGameStateToAll(currentRoom);
  });

  socket.on("continueToBoard", () => {
    if (!currentRoom) return;
    const result = gameManager.continueToBoard(currentRoom, socket.id);
    if (result.error) {
      socket.emit("error", result.error);
      return;
    }
    
    if (result.allAnswered) {
      const room = gameManager.getRoom(currentRoom);
      if (room) {
        room.state = "finished";
        emitPlayerUpdate(room);
        io.to(currentRoom).emit("gameFinished", sanitizeRoom(room));
        return;
      }
    }
    
    emitPlayerUpdate(result.room);
    sendGameStateToAll(currentRoom);
  });

  // Switch active team (host-only Jeopardy)
  socket.on("switchActiveTeam", (teamId) => {
    if (!currentRoom) return;
    const result = gameManager.switchActiveTeam(currentRoom, socket.id, parseInt(teamId));
    if (result?.error) {
      socket.emit("error", result.error);
      return;
    }
    sendGameStateToAll(currentRoom);
  });


  // --- Admin Actions ---

  socket.on("leaveRoom", () => {
    if (!currentRoom) return;
    const room = gameManager.leaveRoom(currentRoom, socket.id);
    socket.leave(currentRoom);
    currentRoom = null;
    if (room) {
      emitPlayerUpdate(room);
    }
  });

  socket.on("adminKick", (targetId) => {
    if (!currentRoom) return;
    const room = gameManager.getRoom(currentRoom);
    if (!room) return;

    const requester = room.players.find((p) => p.id === socket.id);
    if (!requester || (!requester.isHost && !requester.isPresentation)) {
      socket.emit("error", "Keine Admin-Rechte");
      return;
    }

    const result = gameManager.kickPlayer(currentRoom, targetId);
    if (result) {
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.emit("kicked");
        targetSocket.leave(currentRoom);
      }
      emitPlayerUpdate(result);
      sendGameStateToAll(currentRoom);
    }
  });

  socket.on("adminSkipTurn", () => {
    if (!currentRoom) return;
    const result = gameManager.adminSkipTurn(currentRoom, socket.id);
    if (result?.error) {
      socket.emit("error", result.error);
      return;
    }
    sendGameStateToAll(currentRoom);
  });

  socket.on("adminResetRound", () => {
    if (!currentRoom) return;
    const result = gameManager.adminResetRound(currentRoom, socket.id);
    if (result?.error) {
      socket.emit("error", result.error);
      return;
    }
    sendGameStateToAll(currentRoom);
  });

  socket.on("adminAdjustScore", ({ targetId, amount }) => {
    if (!currentRoom) return;
    const result = gameManager.adminAdjustScore(
      currentRoom,
      socket.id,
      targetId,
      amount,
    );
    if (result?.error) {
      socket.emit("error", result.error);
      return;
    }
    sendGameStateToAll(currentRoom);
  });

  socket.on("adminSetActive", (targetId) => {
    if (!currentRoom) return;
    const result = gameManager.adminSetActive(currentRoom, socket.id, targetId);
    if (result?.error) {
      socket.emit("error", result.error);
      return;
    }
    sendGameStateToAll(currentRoom);
  });

  socket.on("adminEndGame", () => {
    if (!currentRoom) return;
    const result = gameManager.adminEndGame(currentRoom, socket.id);
    if (result?.error) {
      socket.emit("error", result.error);
      return;
    }
    io.to(currentRoom).emit("gameOver", result);
  });

  // --- Disconnect ---

  socket.on("disconnect", () => {
    console.log(`Spieler getrennt: ${socket.id}`);
    if (currentRoom) {
      const room = gameManager.leaveRoom(currentRoom, socket.id);
      if (room) {
        emitPlayerUpdate(room);
        // Also update game state so remaining players see admin change / turn advance
        if (room.state === "playing") {
          sendGameStateToAll(currentRoom);
        }
      }
    }
  });
});

// Start server
server.listen(PORT, "0.0.0.0", () => {
  const networkIPs = getAllIPs();
  console.log("\n🎮 Kechters Spielestube - Server gestartet!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Lokal:     http://localhost:${PORT}`);
  networkIPs.forEach((ip) => {
    console.log(`  ${ip.name}:  http://${ip.address}:${PORT}`);
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📱 Wähle die IP, die deinem WLAN entspricht (z.B. Wi-Fi)!\n");
});
