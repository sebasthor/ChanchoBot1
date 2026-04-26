const express = require("express");
const path = require("path");
const fs = require("fs");

// SOLO para local (Render no lo necesita)
if (process.env.NODE_ENV !== "production") {
  try {
    require("dotenv").config();
  } catch (_) {}
}

const app = express();

// 🔥 DEBUG (después lo podés borrar)
console.log("API KEY:", process.env.OPENAI_API_KEY ? "OK" : "NO EXISTE");
console.log("MODEL:", process.env.OPENAI_MODEL);

// CONFIG
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// middleware
app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

// prompt base
let promptBase = "";
try {
  promptBase = fs.readFileSync(
    path.join(__dirname, "prompt_base.txt"),
    "utf-8"
  );
} catch (e) {
  console.log("No se encontró prompt_base.txt, usando default");
  promptBase = "Sos un bot argentino con tono directo, medio ácido pero útil.";
}

// memoria simple
const conversations = {};

// 🔥 GENERAR RESPUESTA
async function generateResponse(userMessage, userId) {
  try {
    const history = conversations[userId] || [];

    const messages = [
      { role: "system", content: promptBase },
      ...history,
      { role: "user", content: userMessage }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error OpenAI:", response.status, data);
      return "Ahora no puedo contestar, chancho. Hasta las máquinas se cansan, mirá vos.";
    }

    const reply = data.choices?.[0]?.message?.content || "No tengo nada para decir.";

    // guardar memoria
    conversations[userId] = [
      ...history,
      { role: "user", content: userMessage },
      { role: "assistant", content: reply }
    ].slice(-10);

    return reply;

  } catch (err) {
    console.error("Error general:", err);
    return "Ahora no puedo contestar, chancho.";
  }
}

// endpoint chat
app.post("/chat", async (req, res) => {
  const { message, userId } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Mensaje vacío" });
  }

  const reply = await generateResponse(message, userId || "anon");

  res.json({ reply });
});

// ruta raíz
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// iniciar server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
