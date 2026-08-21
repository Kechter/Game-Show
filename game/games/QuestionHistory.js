/**
 * QuestionHistory – verfolgt bereits gespielte Fragen über mehrere Runden.
 * Daten werden in einer lokalen JSON-Datei gespeichert (bleibt nach Server-Restart erhalten).
 *
 * Struktur der jeopardy_history.json:
 * {
 *   "allgemein": {
 *     "Tech & Web": ["Frage-Text 1", "Frage-Text 2", ...],
 *     "Geschichte":  ["..."]
 *   }
 * }
 */

const fs   = require("fs");
const path = require("path");

const HISTORY_FILE = path.join(__dirname, "jeopardy_history.json");

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
    }
  } catch (e) {
    console.warn("[QuestionHistory] Fehler beim Laden, starte frisch:", e.message);
  }
  return {};
}

function saveHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf8");
  } catch (e) {
    console.error("[QuestionHistory] Fehler beim Speichern:", e.message);
  }
}

function getPlayedQuestions(theme, catName) {
  const history = loadHistory();
  const played = history?.[theme]?.[catName] ?? [];
  return new Set(played);
}

function markQuestionsPlayed(theme, catName, questionTexts) {
  const history = loadHistory();
  if (!history[theme]) history[theme] = {};
  if (!history[theme][catName]) history[theme][catName] = [];
  const existing = new Set(history[theme][catName]);
  for (const q of questionTexts) existing.add(q);
  history[theme][catName] = [...existing];
  saveHistory(history);
}

function checkAvailability(theme, catName, allQuestions) {
  const played = getPlayedQuestions(theme, catName);
  const available = allQuestions.filter(q => !played.has(q.q)).length;
  return {
    available,
    total: allQuestions.length,
    warning: available < 5,
  };
}

function resetHistory(theme) {
  if (!theme) {
    saveHistory({});
    console.log("[QuestionHistory] Gesamte History zurückgesetzt.");
  } else {
    const history = loadHistory();
    delete history[theme];
    saveHistory(history);
    console.log(`[QuestionHistory] History für Theme '${theme}' zurückgesetzt.`);
  }
}

function getFullHistory() {
  return loadHistory();
}

module.exports = { getPlayedQuestions, markQuestionsPlayed, checkAvailability, resetHistory, getFullHistory };
