const categories = [
  {
    topic: "Trennungsgrund",
    scale: ["Völlig verständlich", "Absolut lächerlich"],
  },
  { topic: "Promi-Skandal", scale: ["Karriere vorbei", "Wen interessiert's"] },
  { topic: "Ausrede für zu spät kommen", scale: ["Glaubwürdig", "Niemals"] },
  { topic: "Essen", scale: ["Haute Cuisine", "Trash Food"] },
  { topic: "Filmgenre", scale: ["Familienfreundlich", "Nur für Erwachsene"] },
  { topic: "Hobby", scale: ["Beeindruckend", "Langweilig"] },
  { topic: "Urlaubsziel", scale: ["Traumhaft", "Albtraum"] },
  { topic: "Tier als Haustier", scale: ["Perfekt", "Wahnsinn"] },
  { topic: "Geschenkidee", scale: ["Genial", "Beleidigend"] },
  { topic: "Superkraft", scale: ["Übermächtig", "Nutzlos"] },
  { topic: "Beruf", scale: ["Traumjob", "Albtraumjob"] },
  { topic: "Sportart", scale: ["Olympisch", "Kein Sport"] },
  { topic: "Partyspiel", scale: ["Legendär", "Stimmungskiller"] },
  { topic: "Erste Date Aktivität", scale: ["Romantisch", "Red Flag"] },
  { topic: "Ausrede für Absage", scale: ["Akzeptabel", "Dreist"] },
  { topic: "Kindername", scale: ["Klassisch schön", "Armes Kind"] },
  { topic: "Lebensweisheit", scale: ["Weise", "Quatsch"] },
  { topic: "Tattoo-Motiv", scale: ["Coole Idee", "Bereust du"] },
  { topic: "Festival-Typ", scale: ["Party-Legende", "Festivalfrischling"] },
  { topic: "Disco-Song", scale: ["Tanzbar", "Sitzbleiber"] },
  { topic: "Pizza-Belag", scale: ["Klassiker", "Verbrechen"] },
  { topic: "Entschuldigung nach Streit", scale: ["Aufrichtig", "Mehr Streit"] },
  { topic: "Geheimnis", scale: ["Harmlos", "Freundschaft vorbei"] },
  { topic: "Frisur", scale: ["Stylisch", "Mutig"] },
  { topic: "Wohnort", scale: ["Lebenswert", "Fluchtgrund"] },
  { topic: "Filmsnack", scale: ["Klassiker", "Weirdo"] },
  { topic: "Ausrede für Krankfeiern", scale: ["Glaubhaft", "Gekündigt"] },
  { topic: "Kompliment", scale: ["Charmant", "Creepy"] },
  { topic: "Morgenroutine", scale: ["Produktiv", "Chaotisch"] },
  { topic: "Social Media Plattform", scale: ["Cool", "Boomer"] },
  // Neue Kategorien
  { topic: "Auf Kärwa", scale: ["Normal", "WTF das ist unmöglich"] },
  {
    topic: "Stammtisch-Diskussionsthema",
    scale: ["Alltäglich", "Freundschaften zerbrechen daran"],
  },
  { topic: "Ausrede", scale: ["Glaubwürdig", "Absurd"] },
  { topic: "Tattoo", scale: ["Dezent", "Extrem"] },
  { topic: "Urlaub", scale: ["Langweilig", "Spektakulär"] },
  { topic: "Date-Idee", scale: ["Klassisch", "Ausgefallen"] },
  { topic: "Haustier", scale: ["Gewöhnlich", "Exotisch"] },
  { topic: "Party", scale: ["Entspannt", "Eskalierend"] },
  { topic: "Nebenjob", scale: ["Bodenständig", "Außergewöhnlich"] },
  { topic: "Superkraft (Variante)", scale: ["Praktisch", "Weltverändernd"] },
  { topic: "Spitzname", scale: ["Normal", "Peinlich"] },
  { topic: "Reality-Show", scale: ["Harmlos", "Kontrovers"] },
  { topic: "Geschenk", scale: ["Einfallslos", "Kreativ"] },
  { topic: "Lüge", scale: ["Harmlos", "Folgenschwer"] },
  { topic: "Modetrend", scale: ["Tragbar", "Exzentrisch"] },
  { topic: "Hobby (Variante)", scale: ["Alltäglich", "Kurios"] },
  { topic: "Beruf (Variante)", scale: ["Seriös", "Skurril"] },
  { topic: "Gericht", scale: ["Schlicht", "Extravagant"] },
  { topic: "Filmidee", scale: ["Vorhersehbar", "Mindblowing"] },
  { topic: "Wette", scale: ["Sicher", "Riskant"] },
];

/**
 * Get a random category that hasn't been used yet
 * @param {string[]} usedTopics - Array of already used topic names
 * @returns {Object|null} Random category or null if all used
 */
function getRandomCategory(usedTopics = []) {
  const available = categories.filter((c) => !usedTopics.includes(c.topic));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Get a random number between 1 and 10
 * @returns {number}
 */
function getRandomNumber() {
  return Math.floor(Math.random() * 10) + 1;
}

module.exports = { categories, getRandomCategory, getRandomNumber };
