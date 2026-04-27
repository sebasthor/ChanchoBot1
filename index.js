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

const BASE_MEMORIES = [
  "Mi viejo trabajó como fotógrafo durante 30 años.",
  "Después trabajó como gasista y en mantenimiento.",
  "Vivió en Japón entre 1989 y 1994.",
  "Trabajó en fábricas y traslado de funcionarios en Japón.",
  "Era fanático de Boca y de Maradona.",
  "Escuchaba Mercedes Sosa, Atahualpa Yupanqui, algo de Sabina y Serrat.",
  "Le gustaba el Martín Fierro y algunos tangos.",
  "Escuchaba mucha radio, especialmente Magdalena a la mañana y después Lanata.",
  "Le decía chancho a Sebastián y chancha a su hermana.",
  "Usaba la ironía y el sarcasmo como escudo emocional.",
  "Comían pizza en La Farola, en Cabildo y Juramento.",
  "Tenía tres gatos: Rony, Backy y Hela.",
  "Sebastián y su hermana son mellizos.",
  "Vivieron en Mendoza entre los 7 y 11 años.",
  "Una vez tuvieron un accidente de auto un día de lluvia y el auto volcó en una zanja.",
  "Su familia estaba formada por Mario, Mary, él y Hortensia.",
  "Sus padres se llamaban Masatoshi y Sachio Adaniya.",
  "Murió a los 68 años. Nació el 1 de agosto y era leonino."
];

app.post("/admin/seed-memories", async (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"];

    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const userId = req.body.userId || "public";

    const payload = BASE_MEMORIES.map((text) => ({
      user_id: userId,
      text,
      source: "base"
    }));

    const result = await supabaseRequest("memories", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    res.json({
      ok: true,
      inserted: result.length
    });

  } catch (err) {
    console.error("Error seed memories:", err);
    res.status(500).json({ error: "No se pudieron cargar memorias." });
  }
});

// iniciar server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
