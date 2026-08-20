const { getRandomCategory, getRandomNumber } = require("../categories");

class HotzoneGame {
  constructor(room) {
    this.room = room;
    this.state = {
      type: "hotzone",
      isActive: true,
      currentRound: 0,
      totalRounds: 10,
      scores: { 1: 0, 2: 0 },
      currentTeam: 1,
      currentPlayerIndex: { 1: 0, 2: 0 },
      currentCategory: null,
      currentNumber: null,
      currentClue: null,
      usedCategories: [],
      roundPhase: null, // 'clue', 'guess', 'result'
    };
  }

  start() {
    return this.startNextRound();
  }

  startNextRound() {
    this.state.currentRound++;
    if (this.state.currentRound > this.state.totalRounds) {
      this.state.isActive = false;
      return { finished: true };
    }

    // Get category and number
    const category = getRandomCategory(this.state.usedCategories);
    if (!category) {
      this.state.isActive = false;
      return { finished: true };
    }

    this.state.usedCategories.push(category.topic);
    this.state.currentCategory = category;
    this.state.currentNumber = getRandomNumber();
    this.state.currentClue = null;
    this.state.roundPhase = "clue";

    return { finished: false };
  }

  getCurrentPlayer() {
    const team = this.state.currentTeam;
    const playerIndex = this.state.currentPlayerIndex[team];
    const playerId = this.room.teams[team][playerIndex];
    return this.room.players.find((p) => p.id === playerId);
  }

  submitClue(playerId, clue) {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return { error: "Du bist nicht am Zug" };
    }

    this.state.currentClue = clue;
    this.state.roundPhase = "guess";
    return {};
  }

  submitGuess(guess) {
    const diff = Math.abs(guess - this.state.currentNumber);
    let points = 0;
    if (diff === 0) points = 3;
    else if (diff === 1) points = 2;
    else if (diff === 2) points = 1;

    this.state.scores[this.state.currentTeam] += points;
    this.state.roundPhase = "result";

    return {
      guess,
      actual: this.state.currentNumber,
      diff,
      points,
      scores: this.state.scores,
      currentTeam: this.state.currentTeam, // needed for result display
    };
  }

  nextTurn() {
    // Move player index for current team
    const team = this.state.currentTeam;
    this.state.currentPlayerIndex[team] =
      (this.state.currentPlayerIndex[team] + 1) % this.room.teams[team].length;

    // Switch teams
    this.state.currentTeam = this.state.currentTeam === 1 ? 2 : 1;

    // Start next round
    return this.startNextRound();
  }

  getPlayerState(playerId) {
    const currentPlayer = this.getCurrentPlayer();
    const isActivePlayer = currentPlayer?.id === playerId;

    return {
      ...this.state,
      currentNumber:
        isActivePlayer || this.state.roundPhase === "result"
          ? this.state.currentNumber
          : null,
      isActivePlayer,
      teams: this.room.teams, // Pass team structure
      players: this.room.players.map((p) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        isHost: p.isHost,
        isPresentation: p.isPresentation,
      })),
    };
  }
}

module.exports = HotzoneGame;
