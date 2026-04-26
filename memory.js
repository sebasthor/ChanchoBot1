const fs = require("fs");
const path = require("path");

function loadMemories() {
  try {
    const data = fs.readFileSync(path.join(__dirname, "memories.json"), "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("No se pudieron cargar los recuerdos:", err);
    return [];
  }
}

function searchMemories(input, max = 4) {
  const memories = loadMemories();
  const tokens = String(input || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t && t.length > 3);

  const scored = memories.map((m) => {
    const text = `${m.text} ${m.context || ""}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (text.includes(token)) score++;
    }
    return { text: m.text, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.text);
}

module.exports = { searchMemories };
