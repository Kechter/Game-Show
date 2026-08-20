// ===== Centralized App State =====
// All mutable state in one place, imported by other modules.

export const state = {
  currentRoom: null,
  currentRoomCode: null,
  playerId: null,
  playerName: "",
  isHost: false,
  isPresentation: false,
  currentGameType: "hotzone",
};
