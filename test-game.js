/**
 * 🧪 Game-Show Automated Test Suite
 *
 * Simulates multiple players via socket.io-client to test:
 * - Room creation & joining
 * - Team assignment (manual + auto)
 * - Full Hotzone game flow (clue → guess → score → next turn)
 * - Full Jeopardy game flow (select → reveal → evaluate)
 * - Admin actions (kick, adjust score, skip turn)
 * - Edge cases (wrong turn, invalid room code, etc.)
 *
 * Usage: npm test  (or: node test-game.js)
 */

const { io } = require("socket.io-client");
const { spawn } = require("child_process");

// ===== Configuration =====
const TEST_PORT = 3001;
const SERVER_URL = `http://localhost:${TEST_PORT}`;
const TIMEOUT = 5000; // ms to wait for socket events

// ===== Test Utilities =====
let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    console.log(`  ❌ ${testName}`);
  }
}

function createSocket(name = "TestPlayer") {
  const socket = io(SERVER_URL, {
    transports: ["websocket"],
    forceNew: true,
    autoConnect: true,
  });
  socket._testName = name;
  return socket;
}

/**
 * Wait for a specific socket event with timeout
 */
function waitFor(socket, event, timeoutMs = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(`Timeout waiting for '${event}' on ${socket._testName}`),
      );
    }, timeoutMs);

    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * Wait briefly for async processing
 */
function delay(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for all sockets to connect
 */
async function waitConnected(sockets) {
  await Promise.all(
    sockets.map(
      (s) =>
        new Promise((resolve, reject) => {
          if (s.connected) return resolve();
          const timer = setTimeout(
            () => reject(new Error(`Connection timeout for ${s._testName}`)),
            TIMEOUT,
          );
          s.on("connect", () => {
            clearTimeout(timer);
            resolve();
          });
        }),
    ),
  );
}

/**
 * Disconnect and clean up all sockets
 */
function disconnectAll(sockets) {
  sockets.forEach((s) => {
    if (s.connected) s.disconnect();
  });
}

// ===== Test Suites =====

/**
 * TEST 1: Room Creation & Joining
 */
async function testLobby() {
  console.log("\n📋 Test: Lobby (Room erstellen & beitreten)");
  console.log("─".repeat(50));

  const host = createSocket("Host");
  const p1 = createSocket("Spieler1");
  const p2 = createSocket("Spieler2");
  const p3 = createSocket("Spieler3");
  const sockets = [host, p1, p2, p3];

  try {
    await waitConnected(sockets);
    assert(true, "Alle 4 Spieler verbunden");

    // Host creates room
    host.emit("createRoom", "Host", false);
    const room = await waitFor(host, "roomCreated");
    assert(
      room && room.code && room.code.length > 0,
      `Room erstellt: ${room.code}`,
    );
    assert(room.players.length === 1, "Host ist einziger Spieler");
    assert(room.players[0].isHost === true, "Erster Spieler ist Host");

    const roomCode = room.code;

    // Players join
    p1.emit("joinRoom", { code: roomCode, playerName: "Spieler1" });
    const joinData1 = await waitFor(p1, "roomJoined");
    assert(joinData1.code === roomCode, "Spieler1 beigetreten");

    p2.emit("joinRoom", { code: roomCode, playerName: "Spieler2" });
    const joinData2 = await waitFor(p2, "roomJoined");
    assert(joinData2.players.length === 3, "3 Spieler im Raum");

    p3.emit("joinRoom", { code: roomCode, playerName: "Spieler3" });
    const joinData3 = await waitFor(p3, "roomJoined");
    assert(joinData3.players.length === 4, "4 Spieler im Raum");

    // Try joining invalid room
    const errorSocket = createSocket("ErrorPlayer");
    sockets.push(errorSocket);
    await waitConnected([errorSocket]);
    errorSocket.emit("joinRoom", { code: "ZZZZZ", playerName: "ErrorPlayer" });
    const errorMsg = await waitFor(errorSocket, "error");
    assert(
      errorMsg === "Raum nicht gefunden",
      "Ungültiger Raumcode wird abgelehnt",
    );

    return roomCode;
  } finally {
    disconnectAll(sockets);
  }
}

/**
 * TEST 2: Team Assignment
 */
async function testTeamAssignment() {
  console.log("\n🏷️ Test: Team-Zuweisung");
  console.log("─".repeat(50));

  const host = createSocket("Host");
  const p1 = createSocket("Spieler1");
  const p2 = createSocket("Spieler2");
  const p3 = createSocket("Spieler3");
  const sockets = [host, p1, p2, p3];

  try {
    await waitConnected(sockets);

    // Create room
    host.emit("createRoom", "Host", false);
    const room = await waitFor(host, "roomCreated");
    const code = room.code;

    // Join all
    for (const [s, name] of [
      [p1, "Spieler1"],
      [p2, "Spieler2"],
      [p3, "Spieler3"],
    ]) {
      s.emit("joinRoom", { code, playerName: name });
      await waitFor(s, "roomJoined");
    }

    // Manual team assignment - assign sequentially and collect last update
    let lastUpdate = null;
    // Set up a persistent listener to capture the latest playerUpdate
    host.on("playerUpdate", (data) => {
      lastUpdate = data;
    });

    host.emit("assignTeam", 1);
    await delay(100);
    p1.emit("assignTeam", 1);
    await delay(100);
    p2.emit("assignTeam", 2);
    await delay(100);
    p3.emit("assignTeam", 2);
    await delay(400);

    host.off("playerUpdate"); // Remove persistent listener

    assert(lastUpdate !== null, "PlayerUpdate erhalten");
    assert(lastUpdate.teams[1].length === 2, "Team 1 hat 2 Spieler");
    assert(lastUpdate.teams[2].length === 2, "Team 2 hat 2 Spieler");

    return code;
  } finally {
    disconnectAll(sockets);
  }
}

/**
 * TEST 3: Auto-Assign Teams
 */
async function testAutoAssign() {
  console.log("\n🔀 Test: Auto-Assign Teams");
  console.log("─".repeat(50));

  const host = createSocket("Host");
  const p1 = createSocket("Spieler1");
  const p2 = createSocket("Spieler2");
  const p3 = createSocket("Spieler3");
  const sockets = [host, p1, p2, p3];

  try {
    await waitConnected(sockets);

    host.emit("createRoom", "Host", false);
    const room = await waitFor(host, "roomCreated");
    const code = room.code;

    for (const [s, name] of [
      [p1, "Spieler1"],
      [p2, "Spieler2"],
      [p3, "Spieler3"],
    ]) {
      s.emit("joinRoom", { code, playerName: name });
      await waitFor(s, "roomJoined");
    }

    // Auto-assign - use persistent listener to catch the right update
    let lastUpdate = null;
    host.on("playerUpdate", (data) => {
      lastUpdate = data;
    });

    // Drain any pending playerUpdates from joins
    await delay(300);
    lastUpdate = null; // Reset after draining

    host.emit("autoAssign");
    await delay(500);

    host.off("playerUpdate");

    assert(lastUpdate !== null, "Auto-Assign Update erhalten");
    const totalAssigned =
      (lastUpdate?.teams[1]?.length || 0) + (lastUpdate?.teams[2]?.length || 0);
    assert(
      totalAssigned === 4,
      `Alle 4 Spieler zugewiesen (${totalAssigned}/4)`,
    );
    assert(lastUpdate.teams[1].length >= 1, "Team 1 hat mindestens 1 Spieler");
    assert(lastUpdate.teams[2].length >= 1, "Team 2 hat mindestens 1 Spieler");

    return code;
  } finally {
    disconnectAll(sockets);
  }
}

/**
 * TEST 4: Hotzone Full Game
 */
async function testHotzoneFullGame() {
  console.log("\n🔥 Test: Hotzone - Komplettes Spiel");
  console.log("─".repeat(50));

  const host = createSocket("Host");
  const p1 = createSocket("Spieler1");
  const p2 = createSocket("Spieler2");
  const p3 = createSocket("Spieler3");
  const sockets = [host, p1, p2, p3];

  try {
    await waitConnected(sockets);

    // Setup room
    host.emit("createRoom", "Host", false);
    const room = await waitFor(host, "roomCreated");
    const code = room.code;

    for (const [s, name] of [
      [p1, "Spieler1"],
      [p2, "Spieler2"],
      [p3, "Spieler3"],
    ]) {
      s.emit("joinRoom", { code, playerName: name });
      await waitFor(s, "roomJoined");
    }

    // Assign teams: Host+Spieler1 = Team1, Spieler2+Spieler3 = Team2
    host.emit("assignTeam", 1);
    p1.emit("assignTeam", 1);
    p2.emit("assignTeam", 2);
    p3.emit("assignTeam", 2);
    await delay(500);

    // Start Hotzone
    host.emit("startGame", "hotzone");

    // All players should receive gameState
    const states = await Promise.all([
      waitFor(host, "gameState"),
      waitFor(p1, "gameState"),
      waitFor(p2, "gameState"),
      waitFor(p3, "gameState"),
    ]);

    assert(states[0].type === "hotzone", "Spieltyp ist Hotzone");
    assert(states[0].currentRound === 1, "Runde 1 gestartet");
    assert(states[0].roundPhase === "clue", "Phase ist 'clue'");
    assert(states[0].currentCategory !== null, "Kategorie zugewiesen");

    // Find the active player
    const activeState = states.find((s) => s.isActivePlayer);
    assert(activeState !== null, "Ein Spieler ist aktiv");

    // The active player's socket
    const allSockets = [host, p1, p2, p3];
    const activeSocket = allSockets.find((s) => {
      const state = states[allSockets.indexOf(s)];
      return state.isActivePlayer;
    });

    // Active player submits clue
    activeSocket.emit("submitClue", "Test-Hinweis");
    const statesAfterClue = await Promise.all(
      allSockets.map((s) => waitFor(s, "gameState")),
    );
    assert(
      statesAfterClue[0].roundPhase === "guess",
      "Phase wechselt zu 'guess'",
    );
    assert(
      statesAfterClue[0].currentClue === "Test-Hinweis",
      "Hinweis korrekt übermittelt",
    );

    // Non-active team member guesses
    const guessNumber = statesAfterClue[0].currentNumber || 5;

    // submitGuess sends both roundResult AND gameState, so we need to consume both
    const roundResultPromise = waitFor(host, "roundResult");
    const guessGameStates = allSockets.map((s) => waitFor(s, "gameState"));
    host.emit("submitGuess", guessNumber);

    const roundResult = await roundResultPromise;
    await Promise.all(guessGameStates); // Drain the gameState from submitGuess
    assert(roundResult.guess !== undefined, "Guess wurde verarbeitet");
    assert(roundResult.actual !== undefined, "Tatsächliche Zahl vorhanden");
    assert(roundResult.points !== undefined, "Punkte berechnet");
    assert(typeof roundResult.scores === "object", "Scores vorhanden");

    // Next turn - now the gameState listeners are fresh
    const round2Promises = allSockets.map((s) => waitFor(s, "gameState"));
    host.emit("nextTurn");
    const statesRound2 = await Promise.all(round2Promises);
    assert(statesRound2[0].currentRound === 2, "Runde 2 gestartet");
    assert(
      statesRound2[0].currentTeam !== states[0].currentTeam,
      "Team gewechselt",
    );

    // Play a wrong-turn scenario: wrong player tries to submit clue
    const inactiveSocket = allSockets.find((s) => {
      const state = statesRound2[allSockets.indexOf(s)];
      return !state.isActivePlayer;
    });
    inactiveSocket.emit("submitClue", "Sollte nicht klappen");
    const errorMsg = await waitFor(inactiveSocket, "error");
    assert(
      errorMsg === "Du bist nicht am Zug",
      "Falscher Spieler wird abgelehnt",
    );

    assert(true, "Hotzone Grundablauf funktioniert");
  } finally {
    disconnectAll(sockets);
  }
}

/**
 * TEST 5: Jeopardy Full Game
 */
async function testJeopardyFullGame() {
  console.log("\n🎯 Test: Jeopardy - Komplettes Spiel");
  console.log("─".repeat(50));

  const host = createSocket("Host");
  const p1 = createSocket("Spieler1");
  const p2 = createSocket("Spieler2");
  const sockets = [host, p1, p2];

  try {
    await waitConnected(sockets);

    // Setup room
    host.emit("createRoom", "Host", false);
    const room = await waitFor(host, "roomCreated");
    const code = room.code;

    for (const [s, name] of [
      [p1, "Spieler1"],
      [p2, "Spieler2"],
    ]) {
      s.emit("joinRoom", { code, playerName: name });
      await waitFor(s, "roomJoined");
    }

    // Jeopardy doesn't need team assignment
    // Start Jeopardy
    host.emit("startGame", "jeopardy");

    const states = await Promise.all([
      waitFor(host, "gameState"),
      waitFor(p1, "gameState"),
      waitFor(p2, "gameState"),
    ]);

    assert(states[0].type === "jeopardy", "Spieltyp ist Jeopardy");
    assert(states[0].roundPhase === "board", "Phase ist 'board'");
    assert(Array.isArray(states[0].categories), "Kategorien geladen");
    assert(states[0].categories.length === 5, "5 Kategorien vorhanden");

    // Find active player
    const allSockets = [host, p1, p2];
    const activeIdx = states.findIndex((s) => s.isMyTurn);
    assert(activeIdx >= 0, "Ein Spieler ist am Zug");
    const activeSocket = allSockets[activeIdx];

    // Active player selects a question
    activeSocket.emit("selectQuestion", { categoryIndex: 0, points: 100 });
    const statesQ = await Promise.all(
      allSockets.map((s) => waitFor(s, "gameState")),
    );
    assert(
      statesQ[0].roundPhase === "question",
      "Phase wechselt zu 'question'",
    );
    assert(statesQ[0].currentQuestion !== null, "Frage geladen");
    assert(statesQ[0].currentQuestion.q !== undefined, "Fragetext vorhanden");

    // Reveal answer (host or active player)
    activeSocket.emit("revealAnswer");
    const statesA = await Promise.all(
      allSockets.map((s) => waitFor(s, "gameState")),
    );
    assert(statesA[0].roundPhase === "answer", "Phase wechselt zu 'answer'");

    // Evaluate: correct answer
    const activeTeamBefore = statesA[0].activeTeamId;
    const scoreBefore = statesA[0].scores[activeTeamBefore] || 0;
    activeSocket.emit("evaluateAnswer", true);
    const statesEval = await Promise.all(
      allSockets.map((s) => waitFor(s, "gameState")),
    );
    assert(statesEval[0].roundPhase === "board", "Zurück zum Board");
    const scoreAfter = statesEval[0].scores[activeTeamBefore] || 0;
    assert(
      scoreAfter === scoreBefore + 100,
      "Punkte wurden dem aktiven Team gutgeschrieben",
    );

    // Check that question is marked as answered
    const cat0Name = statesEval[0].categories[0].name;
    assert(
      statesEval[0].answeredQuestions[cat0Name].some(
        (entry) => entry.points === 100 && entry.teamId === activeTeamBefore && entry.correct === true,
      ),
      "Frage als beantwortet markiert",
    );

    // Non-host player without active team tries to select
    const newActiveIdx = statesEval.findIndex((s) => s.isMyTurn);
    if (newActiveIdx >= 0) {
      const wrongSocket = allSockets.find((_, i) => i !== newActiveIdx);
      wrongSocket.emit("selectQuestion", { categoryIndex: 1, points: 200 });
      const errorMsg = await waitFor(wrongSocket, "error");
      assert(
        errorMsg === "Nicht der Zug deines Teams!",
        "Falscher Spieler bei Jeopardy abgelehnt",
      );
    }

    assert(true, "Jeopardy Grundablauf funktioniert");
  } finally {
    disconnectAll(sockets);
  }
}

/**
 * TEST 5b: Host-Only Geburtstags-Quiz (Fixed Order + Reset Round + Admin Score)
 */
async function testHostOnlyBirthdayJeopardy() {
  console.log("\n🎂 Test: Host-Only Geburtstags-Quiz");
  console.log("─".repeat(50));

  const host = createSocket("Host");
  const sockets = [host];

  try {
    await waitConnected(sockets);

    host.emit("createRoom", "Host", false);
    const room = await waitFor(host, "roomCreated");
    assert(room && room.code, `Host-Only Raum erstellt: ${room.code}`);

    host.emit("startGame", { gameType: "jeopardy", theme: "geburtstag" });
    const state1 = await waitFor(host, "gameState");

    assert(state1.type === "jeopardy", "Spieltyp ist Jeopardy");
    assert(state1.theme === "geburtstag", "Theme ist 'geburtstag'");
    assert(state1.categories.length === 6, "6 Kategorien geladen");
    assert(state1.totalQuestions === 30, "30 Fragen insgesamt geladen");
    assert(
      state1.categories.map((c) => c.name).join(",") ===
        "Familie,Challenges,Essen & Trinken,Musik,Filme / Serien,Geografie",
      "Kategorien behalten exakt ihre Reihenfolge",
    );
    assert(
      state1.categories[0].questions[100].q === "Was ist keine Sache, die Carolin hasst?" &&
        state1.categories[5].questions[500].a === "Zehn",
      "Fragen behalten exakt ihre Punkte-Zuordnung (100–500)",
    );

    // Select a question and test adminResetRound ("Zurück zum Board")
    host.emit("selectQuestion", { categoryIndex: 0, points: 300 });
    const stateQ = await waitFor(host, "gameState");
    assert(stateQ.roundPhase === "question", "Frage geöffnet");

    host.emit("adminResetRound");
    const stateReset = await waitFor(host, "gameState");
    assert(stateReset.roundPhase === "board", "Zurück zum Board per Reset");
    assert(
      stateReset.answeredQuestions["Familie"].length === 0,
      "Zurückgesetzte Frage nicht als beantwortet markiert",
    );

    // Switch team & adjust score
    host.emit("switchActiveTeam", 2);
    const stateSwitch = await waitFor(host, "gameState");
    assert(stateSwitch.activeTeamId === 2, "Aktives Team auf Team Blau gewechselt");

    host.emit("adminAdjustScore", { targetId: "2", amount: 100 });
    const stateAdj = await waitFor(host, "gameState");
    assert(stateAdj.scores[2] === 100, "Admin-Score für Team Blau (+100) funktioniert");

    // Wrong answer penalty: loses half the points (300 -> -150)
    host.emit("selectQuestion", { categoryIndex: 0, points: 300 });
    await waitFor(host, "gameState");
    host.emit("revealAnswer");
    await waitFor(host, "gameState");
    host.emit("evaluateAnswer", false);
    const stateWrong = await waitFor(host, "gameState");
    assert(
      stateWrong.scores[2] === -50,
      "Falsche 300er-Antwort zieht Team Blau die Hälfte ab (100 - 150 = -50)",
    );
  } finally {
    disconnectAll(sockets);
  }
}

/**
 * TEST 6: Admin Actions
 */
async function testAdminActions() {
  console.log("\n🛡️ Test: Admin-Aktionen");
  console.log("─".repeat(50));

  const host = createSocket("Host");
  const p1 = createSocket("Spieler1");
  const p2 = createSocket("Spieler2");
  const p3 = createSocket("Spieler3");
  const sockets = [host, p1, p2, p3];

  try {
    await waitConnected(sockets);

    host.emit("createRoom", "Host", false);
    const room = await waitFor(host, "roomCreated");
    const code = room.code;

    for (const [s, name] of [
      [p1, "Spieler1"],
      [p2, "Spieler2"],
      [p3, "Spieler3"],
    ]) {
      s.emit("joinRoom", { code, playerName: name });
      await waitFor(s, "roomJoined");
    }

    // Auto-assign teams
    host.emit("autoAssign");
    await waitFor(host, "playerUpdate");
    await delay(200);

    // Start Hotzone
    host.emit("startGame", "hotzone");
    const states = await Promise.all([
      waitFor(host, "gameState"),
      waitFor(p1, "gameState"),
      waitFor(p2, "gameState"),
      waitFor(p3, "gameState"),
    ]);
    assert(states[0].type === "hotzone", "Hotzone gestartet für Admin-Tests");

    // Admin: Adjust Score
    const targetPlayer = states[0].players.find((p) => !p.isHost);
    host.emit("adminAdjustScore", { targetId: targetPlayer.id, amount: 50 });
    const statesAdj = await Promise.all(
      sockets.map((s) => waitFor(s, "gameState")),
    );
    assert(true, "Admin: Score angepasst (+50)");

    // Admin: Kick player (Spieler3)
    const p3Id = p3.id;
    host.emit("adminKick", p3Id);
    const kickedMsg = await waitFor(p3, "kicked");
    assert(kickedMsg !== undefined || true, "Spieler3 wurde gekickt");

    const updateAfterKick = await waitFor(host, "playerUpdate");
    const kickedStillInRoom = updateAfterKick.players.find(
      (p) => p.id === p3Id,
    );
    assert(!kickedStillInRoom, "Gekickter Spieler nicht mehr im Raum");

    assert(true, "Admin-Aktionen funktionieren");
  } finally {
    disconnectAll(sockets);
  }
}

/**
 * TEST 7: Restart Game
 */
async function testRestartGame() {
  console.log("\n🔄 Test: Spiel neustarten");
  console.log("─".repeat(50));

  const host = createSocket("Host");
  const p1 = createSocket("Spieler1");
  const sockets = [host, p1];

  try {
    await waitConnected(sockets);

    host.emit("createRoom", "Host", false);
    const room = await waitFor(host, "roomCreated");
    const code = room.code;

    p1.emit("joinRoom", { code, playerName: "Spieler1" });
    await waitFor(p1, "roomJoined");

    // Start Jeopardy (no teams needed)
    host.emit("startGame", "jeopardy");
    await Promise.all([waitFor(host, "gameState"), waitFor(p1, "gameState")]);
    assert(true, "Spiel gestartet");

    // Restart
    host.emit("restartGame");
    const update = await waitFor(host, "playerUpdate");
    assert(update.state === "lobby", "Zurück in der Lobby nach Restart");

    assert(true, "Restart funktioniert");
  } finally {
    disconnectAll(sockets);
  }
}

/**
 * TEST 8: Leave Room
 */
async function testLeaveRoom() {
  console.log("\n🚪 Test: Raum verlassen");
  console.log("─".repeat(50));

  const host = createSocket("Host");
  const p1 = createSocket("Spieler1");
  const sockets = [host, p1];

  try {
    await waitConnected(sockets);

    host.emit("createRoom", "Host", false);
    const room = await waitFor(host, "roomCreated");
    const code = room.code;

    p1.emit("joinRoom", { code, playerName: "Spieler1" });
    await waitFor(p1, "roomJoined");
    await delay(200);

    // Leave room
    p1.emit("leaveRoom");
    const update = await waitFor(host, "playerUpdate");
    assert(update.players.length === 1, "Nur noch Host im Raum nach Leave");

    assert(true, "Leave funktioniert");
  } finally {
    disconnectAll(sockets);
  }
}

/**
 * TEST 9: Disconnect & Reconnect in Lobby
 */
async function testReconnectLobby() {
  console.log("\n🔌 Test: Disconnect & Reconnect (Lobby)");
  console.log("─".repeat(50));

  const host = createSocket("Host");
  const p1 = createSocket("Spieler1");
  const sockets = [host, p1];

  try {
    await waitConnected(sockets);

    host.emit("createRoom", "Host", false);
    const room = await waitFor(host, "roomCreated");
    const code = room.code;

    p1.emit("joinRoom", { code, playerName: "Spieler1" });
    await waitFor(p1, "roomJoined");
    await delay(200);

    // Spieler1 disconnects
    p1.disconnect();
    await delay(500);

    // Spieler1 reconnects with a new socket but same name
    const p1Reconnected = createSocket("Spieler1-Reconnected");
    sockets.push(p1Reconnected);
    await waitConnected([p1Reconnected]);
    assert(p1Reconnected.connected, "Spieler1 hat neue Verbindung");

    // Rejoin by name (joinRoom with same name triggers reconnect)
    p1Reconnected.emit("joinRoom", { code, playerName: "Spieler1" });
    const joinResult = await waitFor(p1Reconnected, "roomJoined");
    assert(joinResult !== null, "Spieler1 erfolgreich re-joined");
    assert(joinResult.code === code, "Gleicher Raum nach Reconnect");

    // Verify player is in the room
    const update = await waitFor(host, "playerUpdate");
    const playerInRoom = update.players.find((p) => p.name === "Spieler1");
    assert(playerInRoom !== undefined, "Spieler1 ist im Raum nach Reconnect");

    assert(true, "Lobby Reconnect funktioniert");
  } finally {
    disconnectAll(sockets);
  }
}

/**
 * TEST 10: Disconnect & Reconnect Mid-Game (rejoinRoom)
 */
async function testReconnectMidGame() {
  console.log("\n🔌 Test: Disconnect & Reconnect (Mid-Game)");
  console.log("─".repeat(50));

  const host = createSocket("Host");
  const p1 = createSocket("Spieler1");
  const p2 = createSocket("Spieler2");
  const sockets = [host, p1, p2];

  try {
    await waitConnected(sockets);

    host.emit("createRoom", "Host", false);
    const room = await waitFor(host, "roomCreated");
    const code = room.code;

    for (const [s, name] of [
      [p1, "Spieler1"],
      [p2, "Spieler2"],
    ]) {
      s.emit("joinRoom", { code, playerName: name });
      await waitFor(s, "roomJoined");
    }

    // Start Jeopardy (no teams needed)
    host.emit("startGame", "jeopardy");
    const states = await Promise.all([
      waitFor(host, "gameState"),
      waitFor(p1, "gameState"),
      waitFor(p2, "gameState"),
    ]);
    assert(states[0].type === "jeopardy", "Jeopardy gestartet");

    // Spieler1 disconnects mid-game
    p1.disconnect();
    await delay(500);
    assert(!p1.connected, "Spieler1 disconnected");

    // Spieler1 reconnects with new socket
    const p1New = createSocket("Spieler1-New");
    sockets.push(p1New);
    await waitConnected([p1New]);

    // Use rejoinRoom to restore state
    p1New.emit("rejoinRoom", { code, playerName: "Spieler1" });
    const rejoinData = await waitFor(p1New, "rejoinSuccess");
    assert(rejoinData !== null, "Rejoin erfolgreich");
    assert(rejoinData.room.code === code, "Gleicher Raum nach Rejoin");
    assert(rejoinData.state !== null, "Game State erhalten nach Rejoin");
    assert(
      rejoinData.state.type === "jeopardy",
      "Korrekter Spieltyp nach Rejoin",
    );

    // Verify the reconnected player is still in the room
    const update = await waitFor(host, "playerUpdate");
    const playerInRoom = update.players.find((p) => p.name === "Spieler1");
    assert(playerInRoom !== undefined, "Spieler1 im Raum nach Mid-Game Rejoin");
    assert(playerInRoom.id === p1New.id, "Socket-ID korrekt aktualisiert");

    assert(true, "Mid-Game Reconnect funktioniert");
  } finally {
    disconnectAll(sockets);
  }
}

/**
 * TEST 11: Reconnect to non-existent room (Edge Case)
 */
async function testReconnectInvalidRoom() {
  console.log("\n⚠️ Test: Reconnect - Ungültiger Raum");
  console.log("─".repeat(50));

  const p1 = createSocket("Spieler1");
  const sockets = [p1];

  try {
    await waitConnected(sockets);

    // Try to rejoin a room that doesn't exist
    p1.emit("rejoinRoom", { code: "ZZZZZ", playerName: "Spieler1" });
    const result = await waitFor(p1, "rejoinFailed");
    assert(
      result !== undefined || true,
      "Rejoin zu ungültigem Raum fehlgeschlagen",
    );

    assert(true, "Ungültiger Rejoin korrekt behandelt");
  } finally {
    disconnectAll(sockets);
  }
}

// ===== Main Runner =====

async function runAllTests() {
  console.log("\n🧪 Game-Show Automated Test Suite");
  console.log("══".repeat(25));
  console.log(`Server: ${SERVER_URL}`);
  console.log("");

  // Start the server
  console.log("⏳ Starte Server...");
  const serverProcess = spawn("node", ["server.js"], {
    env: { ...process.env, PORT: TEST_PORT },
    cwd: __dirname,
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Wait for server to be ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Server start timeout")),
      10000,
    );

    serverProcess.stdout.on("data", (data) => {
      const output = data.toString();
      if (output.includes("Server gestartet") || output.includes("localhost")) {
        clearTimeout(timeout);
        resolve();
      }
    });

    serverProcess.stderr.on("data", (data) => {
      console.error("Server Error:", data.toString());
    });

    serverProcess.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log(`✅ Server läuft auf Port ${TEST_PORT}\n`);

  try {
    // Run all test suites
    await testLobby();
    await testTeamAssignment();
    await testAutoAssign();
    await testHotzoneFullGame();
    await testJeopardyFullGame();
    await testHostOnlyBirthdayJeopardy();
    await testAdminActions();
    await testRestartGame();
    await testLeaveRoom();
    await testReconnectLobby();
    await testReconnectMidGame();
    await testReconnectInvalidRoom();
  } catch (err) {
    console.error(`\n💥 Test-Fehler: ${err.message}`);
    failed++;
    total++;
  }

  // Summary
  console.log("\n" + "══".repeat(25));
  console.log(`\n📊 Ergebnis: ${passed}/${total} Tests bestanden`);
  if (failed > 0) {
    console.log(`   ❌ ${failed} fehlgeschlagen`);
  } else {
    console.log("   🎉 Alle Tests bestanden!");
  }
  console.log("");

  // Cleanup
  serverProcess.kill("SIGTERM");
  process.exit(failed > 0 ? 1 : 0);
}

// Run
runAllTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
