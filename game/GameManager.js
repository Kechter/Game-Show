const HotzoneGame = require("./games/Hotzone");
const JeopardyGame = require("./games/Jeopardy");

class GameManager {
  constructor() {
    this.rooms = new Map();
    this.cleanupTimeouts = new Map();
  }

  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code;
    do {
      code = "";
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  /**
   * Get list of active rooms for lobby display
   */
  getActiveRooms() {
    const rooms = [];
    for (const [code, room] of this.rooms) {
      // Only show rooms with players
      if (room.players.length === 0) continue;
      const host = room.players.find((p) => p.isHost);
      rooms.push({
        code,
        playerCount: room.players.filter((p) => !p.isPresentation).length,
        state: room.state,
        gameType: room.gameType,
        hostName: host ? host.name : "???",
      });
    }
    return rooms;
  }

  createRoom(hostId, hostName, isPresentation) {
    const code = this.generateRoomCode();
    const room = {
      code,
      hostId,
      players: [
        {
          id: hostId,
          name: hostName,
          team: null,
          isHost: true,
          isPresentation: !!isPresentation,
        },
      ],
      teams: { 1: [], 2: [] },
      state: "lobby", // lobby, playing, finished
      gameType: null, // 'hotzone', 'jeopardy'
      gameInstance: null, // The actual game object
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get(code?.toUpperCase());
  }

  joinRoom(code, playerId, playerName, isPresentation) {
    const room = this.getRoom(code);
    if (!room) return { error: "Raum nicht gefunden" };

    // Cancel cleanup if room was marked for deletion
    if (this.cleanupTimeouts.has(code)) {
      console.log(`Löschung für Raum ${code} abgebrochen (Neuer Joiner).`);
      clearTimeout(this.cleanupTimeouts.get(code));
      this.cleanupTimeouts.delete(code);
    }

    if (room.state === "finished") return { error: "Spiel ist beendet" };

    // Check if player already exists (by ID or name)
    const existingById = room.players.find((p) => p.id === playerId);
    if (existingById) return { room, alreadyJoined: true };

    const existingByName = room.players.find((p) => p.name === playerName);
    if (existingByName) {
      // Reconnect logic
      const oldId = existingByName.id;
      existingByName.id = playerId;

      // Update team arrays
      for (const team of [1, 2]) {
        const idx = room.teams[team].indexOf(oldId);
        if (idx !== -1) {
          room.teams[team][idx] = playerId;
        }
      }

      if (room.hostId === oldId) room.hostId = playerId;

      // Update presentation status on reconnect
      if (isPresentation !== undefined) {
        existingByName.isPresentation = !!isPresentation;
      }

      // Restore Jeopardy score if player had one under old ID
      if (room.gameInstance && room.gameType === "jeopardy") {
        const scores = room.gameInstance.state.scores;
        if (scores[oldId] !== undefined) {
          scores[playerId] = scores[oldId];
          delete scores[oldId];
        }
        // Also update activePlayerId if it was this player
        if (room.gameInstance.state.activePlayerId === oldId) {
          room.gameInstance.state.activePlayerId = playerId;
        }
      }

      return { room, reconnected: true };
    }

    // Check if this player was previously disconnected (restore data)
    const wasEmpty = room.players.length === 0;
    let restoredData = null;

    if (room.disconnectedPlayers) {
      const dcIndex = room.disconnectedPlayers.findIndex(
        (d) => d.name === playerName,
      );
      if (dcIndex !== -1) {
        restoredData = room.disconnectedPlayers[dcIndex];
        room.disconnectedPlayers.splice(dcIndex, 1);
      }
    }

    // If room was empty, first joiner becomes admin
    const shouldBeHost = wasEmpty || !room.players.some((p) => p.isHost);

    room.players.push({
      id: playerId,
      name: playerName,
      team: restoredData ? restoredData.team : null,
      isHost: shouldBeHost,
      isPresentation: !!isPresentation,
    });

    if (shouldBeHost) {
      room.hostId = playerId;
      // Clear isHost from others
      room.players.forEach((p) => {
        if (p.id !== playerId) p.isHost = false;
      });
      console.log(
        `${playerName} ist neuer Admin in Raum ${code} (erster Joiner)`,
      );
    }

    // Restore team assignment
    if (restoredData && restoredData.team) {
      if (!room.teams[restoredData.team].includes(playerId)) {
        room.teams[restoredData.team].push(playerId);
      }
    }

    // Restore Jeopardy score
    if (
      restoredData &&
      restoredData.score !== null &&
      room.gameInstance &&
      room.gameType === "jeopardy"
    ) {
      room.gameInstance.state.scores[playerId] = restoredData.score;
    }

    return {
      room,
      isNewPlayer: true,
      gameInProgress: room.state === "playing",
      restored: !!restoredData,
    };
  }

  leaveRoom(code, playerId) {
    const room = this.getRoom(code);
    if (!room) return null;

    const leavingPlayer = room.players.find((p) => p.id === playerId);

    // Save disconnected player data for potential rejoin (scores, team, name)
    if (leavingPlayer && !leavingPlayer.isPresentation) {
      if (!room.disconnectedPlayers) room.disconnectedPlayers = [];

      // Get current score
      let score = 0;
      if (room.gameInstance && room.gameInstance.state.scores) {
        if (room.gameType === "jeopardy") {
          score = room.gameInstance.state.scores[playerId] || 0;
        }
      }
      if (room.gameType === "hotzone") {
        score = null; // Team scores, no individual
      }

      // Store player data (avoid duplicates by name)
      const existing = room.disconnectedPlayers.findIndex(
        (d) => d.name === leavingPlayer.name,
      );
      const data = {
        name: leavingPlayer.name,
        team: leavingPlayer.team,
        score,
        timestamp: Date.now(),
      };
      if (existing !== -1) {
        room.disconnectedPlayers[existing] = data;
      } else {
        room.disconnectedPlayers.push(data);
      }
    }

    room.players = room.players.filter((p) => p.id !== playerId);
    room.teams[1] = room.teams[1].filter((id) => id !== playerId);
    room.teams[2] = room.teams[2].filter((id) => id !== playerId);

    // If the active player in Jeopardy left, advance turn
    if (room.gameInstance && room.gameType === "jeopardy") {
      if (room.gameInstance.state.activePlayerId === playerId) {
        room.gameInstance.setNextActivePlayer();
      }
    }

    if (room.players.length === 0) {
      // Grace period: 30s before destroying room to allow reconnects
      console.log(`Raum ${code} leer. Löschung in 30s...`);
      const timeout = setTimeout(() => {
        if (this.rooms.has(code) && this.rooms.get(code).players.length === 0) {
          console.log(`Raum ${code} gelöscht (Timeout).`);
          this.rooms.delete(code);
          this.cleanupTimeouts.delete(code);
        }
      }, 30000);
      this.cleanupTimeouts.set(code, timeout);
      return null;
    }

    // Admin succession: assign new host if admin left
    if (room.hostId === playerId) {
      // Prefer non-presentation players
      const newHost =
        room.players.find((p) => !p.isPresentation) || room.players[0];
      room.hostId = newHost.id;
      room.players.forEach((p) => (p.isHost = false));
      newHost.isHost = true;
      console.log(
        `Admin-Wechsel in Raum ${code}: neuer Admin ist ${newHost.name}`,
      );
    }

    return room;
  }

  assignTeam(code, playerId, team) {
    const room = this.getRoom(code);
    if (!room) return null;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return null;

    if (player.team) {
      room.teams[player.team] = room.teams[player.team].filter(
        (id) => id !== playerId,
      );
    }

    player.team = team;
    if (!room.teams[team].includes(playerId)) {
      room.teams[team].push(playerId);
    }

    return room;
  }

  autoAssignTeams(code) {
    const room = this.getRoom(code);
    if (!room) return null;

    const shuffled = [...room.players].sort(() => Math.random() - 0.5);
    room.teams = { 1: [], 2: [] };

    shuffled.forEach((player, index) => {
      const team = (index % 2) + 1;
      player.team = team;
      room.teams[team].push(player.id);
    });

    return room;
  }

  startGame(code, gameType = "hotzone", options = {}) {
    const room = this.getRoom(code);
    if (!room) return { error: "Raum nicht gefunden" };

    // Check teams (required for Hotzone, maybe different for others)
    if (gameType === "hotzone") {
      if (room.teams[1].length < 1 || room.teams[2].length < 1) {
        return { error: "Jedes Team braucht mindestens 1 Spieler" };
      }
      room.gameInstance = new HotzoneGame(room);
    } else if (gameType === "jeopardy") {
      room.gameInstance = new JeopardyGame(room, options.theme || "allgemein");
    } else {
      return { error: "Spielmodus noch nicht verfügbar" };
    }

    room.state = "playing";
    room.gameType = gameType;

    const startResult = room.gameInstance.start();
    return { room, ...startResult };
  }

  // --- Game Proxy Methods ---

  getPlayerState(code, playerId) {
    const room = this.getRoom(code);
    if (!room || !room.gameInstance) return null;
    return room.gameInstance.getPlayerState(playerId);
  }

  submitClue(code, playerId, clue) {
    const room = this.getRoom(code);
    if (!room || !room.gameInstance) return { error: "Kein Spiel aktiv" };
    return room.gameInstance.submitClue(playerId, clue);
  }

  submitGuess(code, guess) {
    const room = this.getRoom(code);
    if (!room || !room.gameInstance) return { error: "Kein Spiel aktiv" };

    const result = room.gameInstance.submitGuess(guess);
    result.room = room; // Client expects room info in result sometimes
    return result;
  }

  nextTurn(code) {
    const room = this.getRoom(code);
    if (!room || !room.gameInstance) return { error: "Kein Spiel aktiv" };

    const result = room.gameInstance.nextTurn();
    if (result.finished) {
      room.state = "finished";
    }
    return { room, ...result };
  }

  // Jeopardy Proxies
  selectQuestion(code, playerId, categoryIndex, points) {
    const room = this.getRoom(code);
    if (!room || !room.gameInstance) return { error: "Kein Spiel aktiv" };
    if (room.gameType !== "jeopardy") return { error: "Falsches Spiel" };
    return room.gameInstance.selectQuestion(playerId, categoryIndex, points);
  }

  revealAnswer(code, playerId) {
    const room = this.getRoom(code);
    if (!room || !room.gameInstance) return { error: "Kein Spiel aktiv" };
    return room.gameInstance.revealAnswer(playerId);
  }

  evaluateAnswer(code, playerId, isCorrect) {
    const room = this.getRoom(code);
    if (!room || !room.gameInstance) return { error: "Kein Spiel aktiv" };
    return room.gameInstance.evaluateAnswer(playerId, isCorrect);
  }

  submitMultipleChoice(code, playerId, selectedOption) {
    const room = this.getRoom(code);
    if (!room || !room.gameInstance) return { error: "Kein Spiel aktiv" };
    return room.gameInstance.submitMultipleChoice(playerId, selectedOption);
  }

  continueToBoard(code, playerId) {
    const room = this.getRoom(code);
    if (!room || !room.gameInstance) return { error: "Kein Spiel aktiv" };
    return room.gameInstance.continueToBoard(playerId);
  }

  /**
   * Switch active team (host-only Jeopardy)
   */
  switchActiveTeam(code, playerId, teamId) {
    const room = this.getRoom(code);
    if (!room || !room.gameInstance) return { error: "Kein Spiel aktiv" };
    if (!this.isAdmin(room, playerId)) return { error: "Keine Admin-Rechte" };
    if (room.gameType !== "jeopardy") return { error: "Falsches Spiel" };
    room.gameInstance.setActiveTeam(teamId);
    return { room };
  }

  // ===== Admin Methods =====

  isAdmin(room, playerId) {
    const player = room.players.find((p) => p.id === playerId);
    return player && (player.isHost || player.isPresentation);
  }

  kickPlayer(code, targetId) {
    const room = this.getRoom(code);
    if (!room) return null;

    // Remove from players
    room.players = room.players.filter((p) => p.id !== targetId);

    // Remove from teams
    room.teams[1] = room.teams[1].filter((id) => id !== targetId);
    room.teams[2] = room.teams[2].filter((id) => id !== targetId);

    // If this was the active player in Jeopardy, advance turn
    if (room.gameInstance && room.gameType === "jeopardy") {
      if (room.gameInstance.state.activePlayerId === targetId) {
        room.gameInstance.setNextActivePlayer();
      }
      // Remove from scores
      delete room.gameInstance.state.scores[targetId];
    }

    return room;
  }

  adminSkipTurn(code, adminId) {
    const room = this.getRoom(code);
    if (!room) return { error: "Raum nicht gefunden" };
    if (!this.isAdmin(room, adminId)) return { error: "Keine Admin-Rechte" };
    if (!room.gameInstance) return { error: "Kein Spiel aktiv" };

    if (room.gameType === "jeopardy") {
      // Clear current question if any, and advance
      if (room.gameInstance.state.currentQuestion) {
        const q = room.gameInstance.state.currentQuestion;
        room.gameInstance.state.answeredQuestions[q.categoryName].push(
          q.points,
        );
        room.gameInstance.state.currentQuestion = null;
        room.gameInstance.state.roundPhase = "board";
      }
      room.gameInstance.setNextActivePlayer();
    }

    return { room };
  }

  adminResetRound(code, adminId) {
    const room = this.getRoom(code);
    if (!room) return { error: "Raum nicht gefunden" };
    if (!this.isAdmin(room, adminId)) return { error: "Keine Admin-Rechte" };
    if (!room.gameInstance) return { error: "Kein Spiel aktiv" };

    if (room.gameType === "jeopardy") {
      // Just clear current question without marking as answered
      room.gameInstance.state.currentQuestion = null;
      room.gameInstance.state.roundPhase = "board";
    }

    return { room };
  }

  adminAdjustScore(code, adminId, targetId, amount) {
    const room = this.getRoom(code);
    if (!room) return { error: "Raum nicht gefunden" };
    if (!this.isAdmin(room, adminId)) return { error: "Keine Admin-Rechte" };
    if (!room.gameInstance) return { error: "Kein Spiel aktiv" };

    if (room.gameType === "jeopardy") {
      if (room.gameInstance.state.scores[targetId] !== undefined) {
        room.gameInstance.state.scores[targetId] += amount;
      }
    } else if (room.gameType === "hotzone") {
      // For Hotzone: targetId is the team number (1 or 2)
      const teamNum = parseInt(targetId);
      if (room.gameInstance.state.scores[teamNum] !== undefined) {
        room.gameInstance.state.scores[teamNum] += amount;
      }
    }

    return { room };
  }

  adminSetActive(code, adminId, targetId) {
    const room = this.getRoom(code);
    if (!room) return { error: "Raum nicht gefunden" };
    if (!this.isAdmin(room, adminId)) return { error: "Keine Admin-Rechte" };
    if (!room.gameInstance) return { error: "Kein Spiel aktiv" };

    if (room.gameType === "jeopardy") {
      // Verify target is a valid player
      const target = room.players.find(
        (p) => p.id === targetId && !p.isPresentation,
      );
      if (!target) return { error: "Spieler nicht gefunden" };

      room.gameInstance.state.activePlayerId = targetId;
    }

    return { room };
  }

  adminEndGame(code, adminId) {
    const room = this.getRoom(code);
    if (!room) return { error: "Raum nicht gefunden" };
    if (!this.isAdmin(room, adminId)) return { error: "Keine Admin-Rechte" };

    room.state = "finished";

    // Calculate final scores
    if (room.gameType === "jeopardy") {
      const scores = room.gameInstance.state.scores;
      const sortedPlayers = Object.entries(scores)
        .map(([id, score]) => ({
          id,
          name: room.players.find((p) => p.id === id)?.name || "Unknown",
          score,
        }))
        .sort((a, b) => b.score - a.score);

      return {
        winner: sortedPlayers[0]?.name || "Niemand",
        scores: sortedPlayers,
      };
    }

    return { winner: "Spiel beendet" };
  }

  restartGame(code) {
    const room = this.getRoom(code);
    if (!room) return null;

    room.state = "lobby";
    room.usedCategories = [];
    if (room.gameInstance) room.gameInstance = null;
    return room;
  }

  setJeopardyTheme(code, hostId, themeId) {
    const room = this.getRoom(code);
    if (!room) return { error: "Raum nicht gefunden" };
    if (room.hostId !== hostId)
      return { error: "Nur der Host kann das Thema ändern" };

    room.jeopardyTheme = themeId;
    return { room, themeId };
  }
}

module.exports = GameManager;
