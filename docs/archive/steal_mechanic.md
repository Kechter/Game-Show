# 🔥 Steal-Mechanik – Archiv

> **Status:** Entfernt am 2026-08-21 – zu spielen ohne dedizierten Game-Host schwierig,
> da Team B die Antwort auf dem Screen sieht, bevor es abstauben darf.
> Hier ist die vollständige Implementierung für spätere Entwicklung archiviert.

## Konzept

Wenn Team A eine Frage falsch beantwortet, bekommt Team B die Chance, die Punkte zu "klauen".
Sinnvoll nur mit Game-Host, der die Auflösung kontrolliert (Antwort erst nach Abstauber zeigen).

---

## Backend – Jeopardy.js

### Zusätzlicher State (im Constructor)

```js
roundPhase: "board", // 'board' | 'question' | 'answer' | 'steal'
stealingTeamId: null, // welches Team die Steal-Chance hat
```

### evaluateAnswer (modifiziert)

```js
evaluateAnswer(playerId, isCorrect) {
  if (this.state.roundPhase !== "answer")
    return { error: "Antwort noch nicht sichtbar" };
  if (!this.canControl(playerId))
    return { error: "Nur Host oder aktives Team darf bewerten" };

  const points = parseInt(this.state.currentQuestion.points);

  if (isCorrect) {
    // ✅ Richtig – Punkte gutschreiben, Frage abschließen
    this.state.scores[this.state.activeTeamId] += points;
    this._closeQuestion(true);
    const allAnswered = this.state.answeredCount >= this.state.totalQuestions;
    if (allAnswered) { this.state.isActive = false; this._commitHistory(); }
    return { room: this.room, allAnswered };
  } else {
    // ❌ Falsch – anderes Team bekommt Steal-Chance
    const otherTeam = this.state.activeTeamId === 1 ? 2 : 1;
    this.state.stealingTeamId = otherTeam;
    this.state.activeTeamId  = otherTeam;
    this.state.roundPhase    = "steal";
    return { room: this.room, allAnswered: false };
  }
}
```

### evaluateSteal (neu)

```js
evaluateSteal(playerId, isCorrect) {
  if (this.state.roundPhase !== "steal")
    return { error: "Keine Steal-Phase aktiv" };
  if (!this.canControl(playerId))
    return { error: "Nur das andere Team oder der Host darf abstauben" };

  const points = parseInt(this.state.currentQuestion.points);
  if (isCorrect) {
    this.state.scores[this.state.activeTeamId] += points;
  }

  this._closeQuestion(isCorrect);
  this.state.stealingTeamId = null;

  const allAnswered = this.state.answeredCount >= this.state.totalQuestions;
  if (allAnswered) { this.state.isActive = false; this._commitHistory(); }
  return { room: this.room, allAnswered };
}
```

### _closeQuestion (Helper)

```js
_closeQuestion(isCorrect) {
  const points = parseInt(this.state.currentQuestion.points);
  this.state.answeredQuestions[this.state.currentQuestion.categoryName].push({
    points,
    teamId: this.state.activeTeamId,
    correct: isCorrect,
  });
  this.state.answeredCount++;
  this.state.currentQuestion = null;
  this.state.roundPhase = "board";
  this.setNextActiveTeam();
}
```

### submitMultipleChoice (modifiziert für Steal)

```js
// MC falsch → mcResolved = false → continueToBoard triggert Steal
if (isCorrect) {
  this.state.currentQuestion.mcResolved = true;
} else {
  this.state.currentQuestion.mcResolved = false;
}
```

### continueToBoard (modifiziert für Steal)

```js
// MC question answered WRONG → trigger steal
if (q && q.isEvaluated && q.mcResolved === false) {
  const otherTeam = this.state.activeTeamId === 1 ? 2 : 1;
  this.state.stealingTeamId = otherTeam;
  this.state.activeTeamId  = otherTeam;
  this.state.roundPhase    = "steal";
  return { room: this.room, allAnswered: false };
}
```

---

## Backend – GameManager.js

```js
evaluateSteal(code, playerId, isCorrect) {
  const room = this.getRoom(code);
  if (!room || !room.gameInstance) return { error: "Kein Spiel aktiv" };
  return room.gameInstance.evaluateSteal(playerId, isCorrect);
}
```

---

## Backend – server.js

```js
socket.on("evaluateSteal", (isCorrect) => {
  if (!currentRoom) return;
  const result = gameManager.evaluateSteal(currentRoom, socket.id, isCorrect);
  if (result.error) { socket.emit("error", result.error); return; }
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
```

---

## Frontend – public/js/views/jeopardy.js

### Event-Listener

```js
document.getElementById("steal-correct")?.addEventListener("click", () => {
  socket.emit("evaluateSteal", true);
});
document.getElementById("steal-wrong")?.addEventListener("click", () => {
  socket.emit("evaluateSteal", false);
});
```

### Turn-Banner (steal phase)

```js
if (gameState.roundPhase === "steal") {
  const stealTeamName = gameState.stealingTeamId === 1 ? "🔴 Team Rot" : "🔵 Team Blau";
  turnBanner.className = "jeopardy-turn-banner steal-phase";
  turnBanner.textContent = `🔥 ABSTAUBER! ${stealTeamName} hat die Chance!`;
}
```

### Steal-Phase Render-Block

```js
if (gameState.roundPhase === "steal") {
  if (qText) qText.textContent = q.q;
  if (revealBtn) revealBtn.style.display = "none";
  if (evalButtons) evalButtons.style.display = "none";
  if (answerContainer) answerContainer.style.display = "none";

  const stealBanner = document.getElementById("steal-banner");
  if (stealBanner) {
    stealBanner.style.display = "block";
    stealBanner.textContent = `🔥 ABSTAUBER! ${stealTeamName} – kannst du die Antwort stehlen?`;
  }
  const stealButtons = document.getElementById("steal-buttons");
  if (stealButtons) stealButtons.style.display = canControl ? "flex" : "none";
  return;
}
```

---

## Frontend – public/index.html

```html
<!-- 🔥 Steal Phase UI -->
<div id="steal-banner" class="steal-banner" style="display: none;"></div>
<div id="steal-buttons" class="steal-buttons" style="display: none;">
    <button id="steal-correct" class="btn btn-correct">🔥 Geklaut! (+Punkte)</button>
    <button id="steal-wrong" class="btn btn-wrong">❌ Nicht geklappt (0 Punkte)</button>
</div>
```

---

## Frontend – public/css/style.css

```css
.steal-banner {
  background: linear-gradient(135deg, #e67e22, #e74c3c);
  color: #fff;
  font-weight: 800;
  animation: stealPulse 1.2s ease-in-out infinite;
  box-shadow: 0 0 24px rgba(231, 76, 60, 0.5);
}
@keyframes stealPulse {
  0%, 100% { transform: scale(1);    box-shadow: 0 0 24px rgba(231,76,60,0.5); }
  50%       { transform: scale(1.02); box-shadow: 0 0 40px rgba(231,76,60,0.9); }
}
.jeopardy-turn-banner.steal-phase {
  background: linear-gradient(135deg, #e67e22, #e74c3c);
  animation: stealPulse 1s ease-in-out infinite;
}
```

---

## Warum entfernt?

Ohne dedizierten Game-Host funktioniert die Mechanik nicht fair:
- Team B sieht die richtige Antwort auf dem Screen, bevor es "abstauben" darf
- Lösung: Antwort erst **nach** dem Steal-Versuch aufdecken – dafür braucht man einen Host,
  der die Auflösung zeitlich kontrolliert (z.B. via separaten "Antwort zeigen"-Button
  der nur dem Host zur Verfügung steht, während Team B buzzert)
