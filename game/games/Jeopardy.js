const jeopardyThemes = require("./jeopardy_data");

class JeopardyGame {
  constructor(room, theme = "allgemein") {
    this.room = room;

    // Get categories for the selected theme (fallback to allgemein)
    const themeData = jeopardyThemes[theme] || jeopardyThemes["allgemein"];
    const allCategories = themeData.categories;

    // Pick 5 random categories from the theme pool
    const shuffled = [...allCategories].sort(() => Math.random() - 0.5);
    const selectedCategories = shuffled.slice(0, 5);

    this.state = {
      type: "jeopardy",
      isActive: true,
      theme: theme,
      themeLabel: themeData.label,
      categories: selectedCategories,
      // Track which questions are answered: { "KategorieName": [{ points: 100, teamId: 1, correct: true }] }
      answeredQuestions: {},
      scores: { 1: 0, 2: 0 },

      // Progress tracking
      totalQuestions: selectedCategories.length * 5, // 5 point values per category
      answeredCount: 0,

      // Turn state
      activeTeamId: 1, // Team 1 starts

      // Question state
      currentQuestion: null, // { categoryIndex: 0, categoryName: "...", points: 200, q: "...", a: "..." }
      roundPhase: "board", // 'board', 'question', 'answer'
    };

    // Initialize answered tracking
    selectedCategories.forEach((cat) => {
      this.state.answeredQuestions[cat.name] = [];
    });
  }

  start() {
    return {
      gameStarted: true,
      state: this.getPublicState(),
    };
  }

  setNextActiveTeam() {
    this.state.activeTeamId = this.state.activeTeamId === 1 ? 2 : 1;
  }

  /**
   * Switch to a specific team (host-only Jeopardy)
   */
  setActiveTeam(teamId) {
    if (teamId === 1 || teamId === 2) {
      this.state.activeTeamId = teamId;
    }
  }

  /**
   * Check whether a player can control the game
   * Host can always control; otherwise must be on the active team
   */
  canControl(playerId) {
    const player = this.room.players.find((p) => p.id === playerId);
    return player && (player.isHost || player.team === this.state.activeTeamId);
  }

  getPlayerState(playerId) {
    const player = this.room.players.find((p) => p.id === playerId);
    const baseState = this.getPublicState();
    return {
      ...baseState,
      // Host is always "their turn" – they control everything
      isMyTurn: player?.isHost || (player && player.team === this.state.activeTeamId),
      isHost: player?.isHost,
    };
  }


  getPublicState() {
    const hasPresentationPlayer = this.room.players.some(
      (p) => p.isPresentation,
    );
    return {
      ...this.state,
      roomCode: this.room.code,
      activeTeamName: this.state.activeTeamId === 1 ? "Team Rot" : "Team Blau",
      hasPresentationPlayer,
      players: this.room.players.map((p) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        isHost: p.isHost,
        isPresentation: p.isPresentation,
        isActive: p.team === this.state.activeTeamId,
      })),
    };
  }

  // --- Actions ---

  // 1. Select Question (by host or active team)
  selectQuestion(playerId, categoryIndex, points) {
    const player = this.room.players.find(p => p.id === playerId);
    // Host can always select; otherwise must be on the active team
    if (!player || (!player.isHost && player.team !== this.state.activeTeamId))
      return { error: "Nicht der Zug deines Teams!" };
    if (this.state.roundPhase !== "board")
      return { error: "Frage läuft bereits" };

    console.log(
      `[Jeopardy] selectQuestion: Player ${playerId} (Team ${player.team}), Cat ${categoryIndex}, Points ${points}`,
    );

    if (this.state.categories[categoryIndex] === undefined) {
      console.error(`[Jeopardy] Invalid Category Index: ${categoryIndex}`);
      return { error: "Ungültige Kategorie" };
    }

    const category = this.state.categories[categoryIndex];

    if (!this.state.answeredQuestions[category.name]) {
      this.state.answeredQuestions[category.name] = [];
    }

    const isAlreadyAnswered = this.state.answeredQuestions[category.name].some(
      (q) => q.points === parseInt(points)
    );

    if (isAlreadyAnswered) {
      return { error: "Frage bereits gespielt" };
    }

    const question = category.questions[points];
    if (!question) {
      return { error: "Frage nicht gefunden" };
    }

    this.state.currentQuestion = {
      categoryIndex,
      categoryName: category.name,
      points,
      q: question.q,
      a: question.a,
      options: question.options || null,
    };
    this.state.roundPhase = "question"; // Show to everyone

    return { room: this.room };
  }

  // 2. Reveal Answer (Host or Active Team)
  revealAnswer(playerId) {
    if (this.state.roundPhase !== "question")
      return { error: "Keine Frage aktiv" };
    if (!this.canControl(playerId)) {
      return { error: "Nur Host oder aktives Team darf aufdecken" };
    }
    this.state.roundPhase = "answer";
    return { room: this.room };
  }

  // 3. Evaluate (Correct/Wrong)
  evaluateAnswer(playerId, isCorrect) {
    if (this.state.roundPhase !== "answer")
      return { error: "Antwort noch nicht sichtbar" };
    if (!this.canControl(playerId)) {
      return { error: "Nur Host oder aktives Team darf bewerten" };
    }

    const points = parseInt(this.state.currentQuestion.points);

    if (isCorrect) {
      this.state.scores[this.state.activeTeamId] += points;
    }
    // Keine Punkteabzüge bei falscher Antwort, nur als gespielt markieren

    // Mark as answered
    this.state.answeredQuestions[this.state.currentQuestion.categoryName].push({
      points,
      teamId: this.state.activeTeamId,
      correct: isCorrect
    });
    
    this.state.answeredCount++;

    // Check if all questions have been answered
    const allAnswered = this.state.answeredCount >= this.state.totalQuestions;

    // Reset for next turn
    this.state.currentQuestion = null;
    this.state.roundPhase = "board";
    this.setNextActiveTeam();

    if (allAnswered) {
      this.state.isActive = false;
    }

    return { room: this.room, allAnswered };
  }

  submitMultipleChoice(playerId, selectedOption) {
    if (this.state.roundPhase !== "question") return { error: "Keine Frage aktiv" };
    if (!this.canControl(playerId)) return { error: "Nicht berechtigt" };

    const isCorrect = (selectedOption === this.state.currentQuestion.a);
    
    // Evaluate points NOW
    const points = parseInt(this.state.currentQuestion.points);
    if (isCorrect) {
      this.state.scores[this.state.activeTeamId] += points;
    }
    
    this.state.answeredQuestions[this.state.currentQuestion.categoryName].push({
      points,
      teamId: this.state.activeTeamId,
      correct: isCorrect
    });
    this.state.answeredCount++;
    
    this.state.roundPhase = "answer";
    this.state.currentQuestion.selectedOption = selectedOption;
    this.state.currentQuestion.isEvaluated = true;
    
    return { room: this.room };
  }

  continueToBoard(playerId) {
    if (this.state.roundPhase !== "answer") return { error: "Nicht in Antwort Phase" };
    if (!this.canControl(playerId)) return { error: "Nicht berechtigt" };

    const allAnswered = this.state.answeredCount >= this.state.totalQuestions;

    if (allAnswered) {
      this.state.isActive = false;
    }

    this.state.roundPhase = "board";
    this.state.currentQuestion = null;
    this.setNextActiveTeam();
    
    return { room: this.room, allAnswered };
  }

  // Proxy handlers for GameManager
  submitGuess() {
    return { error: "Nicht unterstützt in Jeopardy" };
  }
  submitClue() {
    return { error: "Nicht unterstützt in Jeopardy" };
  }
  nextTurn() {
    return { error: "Nutze evaluateAnswer" };
  }
  // Static: get available themes for UI
  static getAvailableThemes() {
    return Object.entries(jeopardyThemes).map(([key, val]) => ({
      id: key,
      label: val.label,
      categoryCount: val.categories.length,
    }));
  }
}

module.exports = JeopardyGame;
