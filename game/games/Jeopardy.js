const jeopardyThemes = require("./jeopardy_data");
const QuestionHistory = require("./QuestionHistory");

class JeopardyGame {
  constructor(room, theme = "allgemein") {
    this.room = room;

    // Get categories for the selected theme (fallback to allgemein)
    const themeData = jeopardyThemes[theme] || jeopardyThemes["allgemein"];
    const allCategories = themeData.categories;
    const preserveOrder = !!themeData.fixedOrder;

    // Keep all categories in exact order for fixed-order quizzes; otherwise pick 5
    const rawCategories = preserveOrder
      ? allCategories
      : allCategories.length <= 5
        ? allCategories.slice(0, 5)
        : [...allCategories].sort(() => Math.random() - 0.5).slice(0, 5);

    // For each category: keep exact 100–500 mapping for fixedOrder / <=5 questions,
    // or pick 5 FRESH questions while preserving relative difficulty order
    const pointValues = [100, 200, 300, 400, 500];
    const historyWarnings = []; // categories with critically low fresh question supply

    // Store the question texts that were picked, so we can commit them on round completion
    const pendingHistoryCommit = []; // [{ catName, questionTexts[] }]

    const selectedCategories = rawCategories.map((cat) => {
      const entries = Object.entries(cat.questions)
        .map(([pts, q]) => ({ pts: parseInt(pts, 10), q }))
        .sort((a, b) => a.pts - b.pts);

      if (preserveOrder || entries.length <= 5) {
        const remappedQuestions = {};
        entries.forEach(({ pts, q }) => {
          remappedQuestions[pts] = q;
        });
        pendingHistoryCommit.push({
          catName: cat.name,
          questionTexts: entries.map((e) => e.q.q),
        });
        return { ...cat, questions: remappedQuestions };
      }

      const played = QuestionHistory.getPlayedQuestions(theme, cat.name);

      // Separate fresh vs. already-played questions
      const fresh = entries.filter((e) => !played.has(e.q.q));
      const stale = entries.filter((e) => played.has(e.q.q));

      // Warn if fresh supply is critically low
      if (fresh.length < 5) {
        historyWarnings.push({
          catName: cat.name,
          freshLeft: fresh.length,
          total: entries.length,
        });
      }

      // Use fresh questions first; if not enough, pad with stale ones
      const shuffledFresh = [...fresh].sort(() => Math.random() - 0.5);
      const shuffledStale = [...stale].sort(() => Math.random() - 0.5);
      const pool = [...shuffledFresh, ...shuffledStale];
      // Preserve relative difficulty order across the 5 picked questions
      const picked = pool.slice(0, 5).sort((a, b) => a.pts - b.pts);

      const remappedQuestions = {};
      pointValues.forEach((pts, i) => {
        remappedQuestions[pts] = picked[i].q;
      });

      // Remember what we picked so we can save it on round completion
      pendingHistoryCommit.push({
        catName: cat.name,
        questionTexts: picked.map((e) => e.q.q),
      });

      return { ...cat, questions: remappedQuestions };
    });

    // Store pending commit and warnings on the instance
    this._theme = theme;
    this._pendingHistoryCommit = pendingHistoryCommit;
    this._historyWarnings = historyWarnings;

    this.state = {
      type: "jeopardy",
      isActive: true,
      theme: theme,
      themeLabel: themeData.label,
      categories: selectedCategories,
      // History warnings (low fresh-question supply)
      historyWarnings,
      // Track which questions are answered: { "KategorieName": [{ points: 100, teamId: 1, correct: true }] }
      answeredQuestions: {},
      scores: { 1: 0, 2: 0 },

      // Progress tracking
      totalQuestions: selectedCategories.length * 5, // 5 point values per category
      answeredCount: 0,

      // Turn state
      activeTeamId: 1, // Team 1 starts

      // Question state
      currentQuestion: null, // { categoryIndex, categoryName, points, q, a, options }
      roundPhase: "board", // 'board' | 'question' | 'answer'
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
    } else {
      // Bei falscher Antwort verliert das Team die Hälfte der Punkte
      this.state.scores[this.state.activeTeamId] -= Math.floor(points / 2);
    }

    // Mark as answered
    this.state.answeredQuestions[this.state.currentQuestion.categoryName].push({
      points,
      teamId: this.state.activeTeamId,
      correct: isCorrect,
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
      this._commitHistory();
    }

    return { room: this.room, allAnswered };
  }

  submitMultipleChoice(playerId, selectedOption) {
    if (this.state.roundPhase !== "question") return { error: "Keine Frage aktiv" };
    if (!this.canControl(playerId)) return { error: "Nicht berechtigt" };

    const isCorrect = (selectedOption === this.state.currentQuestion.a);

    // Evaluate points immediately
    const points = parseInt(this.state.currentQuestion.points);
    if (isCorrect) {
      this.state.scores[this.state.activeTeamId] += points;
    } else {
      this.state.scores[this.state.activeTeamId] -= Math.floor(points / 2);
    }

    this.state.answeredQuestions[this.state.currentQuestion.categoryName].push({
      points,
      teamId: this.state.activeTeamId,
      correct: isCorrect,
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
      this._commitHistory();
    }

    this.state.roundPhase = "board";
    this.state.currentQuestion = null;
    this.setNextActiveTeam();

    return { room: this.room, allAnswered };
  }

  /**
   * Commits the played questions to persistent history (only called on full round completion).
   */
  _commitHistory() {
    for (const { catName, questionTexts } of this._pendingHistoryCommit) {
      QuestionHistory.markQuestionsPlayed(this._theme, catName, questionTexts);
    }
    console.log(`[Jeopardy] History gespeichert für Theme '${this._theme}'.`);
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

  /** Setzt die Fragen-History für ein Theme (oder alle) zurück – nützlich für Admin. */
  static resetHistory(theme) {
    QuestionHistory.resetHistory(theme);
  }

  /** Gibt die vollständige History zurück (für Admin/Debug). */
  static getHistory() {
    return QuestionHistory.getFullHistory();
  }
}

module.exports = JeopardyGame;
