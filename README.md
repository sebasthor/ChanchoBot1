# ChanchoBot Público

## Local
1. Copiá `.env.example` a `.env`
2. Agregá tu OPENAI_API_KEY
3. Ejecutá:

```bash
npm install
npm start
```

Abrí:
http://localhost:3000

## Publicarlo para todos en Render

1. Subí esta carpeta a GitHub
2. En Render.com: New > Web Service
3. Conectá el repo
4. Build command:
   npm install
5. Start command:
   npm start
6. En Environment Variables agregá:
   OPENAI_API_KEY = tu key
   OPENAI_MODEL = gpt-5
   MAX_MESSAGES_PER_WINDOW = 20

Render te dará una URL pública.
