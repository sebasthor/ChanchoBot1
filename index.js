#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const express = require("express");

try {
  require("dotenv").config();
} catch (_) {}

const { searchMemories } = require("./memory");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

const promptBase = fs.readFileSync(path.join(__dirname, "prompt_base.txt"), "utf-8");
const conversations = {};

// Simple anti-spam por IP: 20 mensajes cada 10 minutos
const rateMap = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const max = Number(process.env.MAX_MESSAGES_PER_WINDOW || 20);

  const record = rateMap.get(ip) || { count: 0, start: now };
  if (now - record.start > windowMs) {
    record.count = 0;
    record.start = now;
  }

  record.count += 1;
  rateMap.set(ip, record);

  if (record.count > max) {
    return res.status(429).json({
      error: "Demasiados mensajes. Probá de nuevo en unos minutos."
    });
  }

  next();
}

async function generateResponse(userMessage, recallTexts, userId) {
  const systemInstructions = `${promptBase}

Recuerdos relevantes:
${recallTexts.length ? recallTexts.join("\n") : "Ninguno por ahora."}`;

  const history = conversations[userId] || [];

  const messages = [
    { role: "system", content: systemInstructions },
    ...history,
    { role: "user", content: userMessage }
  ];

  if (!process.env.OPENAI_API_KEY) {
    return "Hola chancho, falta configurar la API key. Manga de apurados.";
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5",
        messages
      })
    });

    const data = await response.json();

    if (response.status >= 400) {
      console.error("Error OpenAI:", response.status, JSON.stringify(data, null, 2));
      return "Ahora no puedo contestar, chancho. Hasta las máquinas se cansan, mirá vos.";
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || "No tengo palabras ahora.";

    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: reply });
    conversations[userId] = history.slice(-12);

    return reply;
  } catch (err) {
    console.error("Fallo OpenAI:", err);
    return "Se trabó esto, chancho. Probá de nuevo.";
  }
}

app.post("/chat", rateLimit, async (req, res) => {
  try {
    const { message, userId = "public-web" } = req.body || {};
    const text = String(message || "").trim();

    if (!text) {
      return res.status(400).json({ error: "Escribí algo primero." });
    }

    if (text.length > 1200) {
      return res.status(400).json({ error: "Mensaje demasiado largo." });
    }

    const recalls = searchMemories(text);
    const reply = await generateResponse(text, recalls, userId);

    return res.json({ reply });
  } catch (err) {
    console.error("Error /chat:", err);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
});

app.post("/reset", (req, res) => {
  const { userId = "public-web" } = req.body || {};
  conversations[userId] = [];
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`ChanchoBot público funcionando en http://localhost:${port}`);
});
