import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { OllamaProvider } from "../providers/ollama.js";
// import { OpenRouterProvider } from "../providers/openrouter.js";
// import { OpenAIProvider } from "../providers/openai.js";
// import { AnthropicProvider } from "../providers/anthropic.js";
// import { GoogleProvider } from "../providers/google.js";

function getProviders(ollamaUrl) {
  return {
    ollama: new OllamaProvider({ baseUrl: ollamaUrl }),
  };
}

const router = Router();

// GET /api/chat/models
router.get("/models", async (req, res) => {
  const providers = getProviders(req.app.get("ollamaUrl"));
  const results = await Promise.all(
    Object.entries(providers).map(async ([providerName, provider]) => {
      try {
        const available = await provider.isAvailable();
        if (!available) {
          return { provider: providerName, status: "offline", models: [] };
        }
        const models = await provider.listModels();
        return { provider: providerName, status: "online", models };
      } catch (err) {
        return { provider: providerName, status: "error", models: [], error: err.message };
      }
    })
  );
  res.json(results);
});

// POST /api/chat/completions  (SSE)
router.post("/completions", async (req, res) => {
  const {
    provider: providerName = "ollama",
    model,
    messages,
    session_id,
    project_id = "default",
    temperature,
  } = req.body;

  if (!model || !messages?.length) {
    return res.status(400).json({ error: "model and messages are required" });
  }

  const providers = getProviders(req.app.get("ollamaUrl"));
  const provider = providers[providerName];
  if (!provider) {
    return res.status(400).json({ error: `Unknown provider: ${providerName}` });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const db = req.app.get("db");

  try {
    // Resolve or create session
    let sessionId = session_id;
    if (!sessionId) {
      sessionId = uuidv4();
      const firstUserMsg = messages.find((m) => m.role === "user");
      const title = firstUserMsg ? firstUserMsg.content.slice(0, 80) : "New chat";
      db.prepare(
        "INSERT INTO chat_sessions (id, project_id, title) VALUES (?, ?, ?)"
      ).run(sessionId, project_id, title);
    }

    // Save user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      db.prepare(
        "INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)"
      ).run(sessionId, "user", lastUserMsg.content);
    }

    send({ type: "session", session_id: sessionId });

    let fullContent = "";
    let totalTokens;

    for await (const chunk of provider.streamCompletion({ model, messages, temperature })) {
      if (chunk.done) {
        totalTokens = chunk.totalTokens;
      } else {
        fullContent += chunk.token;
        send({ type: "token", token: chunk.token, done: false });
      }
    }

    // Save assistant response
    db.prepare(
      "INSERT INTO chat_messages (session_id, role, content, model, provider, tokens_used) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(sessionId, "assistant", fullContent, model, providerName, totalTokens ?? null);

    // Update session updated_at
    db.prepare(
      "UPDATE chat_sessions SET updated_at = datetime('now') WHERE id = ?"
    ).run(sessionId);

    send({ type: "done", session_id: sessionId });
  } catch (err) {
    send({ type: "error", error: err.message });
  }

  res.end();
});

// GET /api/chat/sessions
router.get("/sessions", (req, res) => {
  const { project_id, limit = 50 } = req.query;
  const db = req.app.get("db");

  let stmt;
  if (project_id) {
    stmt = db.prepare(
      "SELECT * FROM chat_sessions WHERE project_id = ? ORDER BY updated_at DESC LIMIT ?"
    );
    res.json(stmt.all(project_id, Number(limit)));
  } else {
    stmt = db.prepare(
      "SELECT * FROM chat_sessions ORDER BY updated_at DESC LIMIT ?"
    );
    res.json(stmt.all(Number(limit)));
  }
});

// GET /api/chat/sessions/:id/messages
router.get("/sessions/:id/messages", (req, res) => {
  const db = req.app.get("db");
  const messages = db
    .prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC")
    .all(req.params.id);
  res.json(messages);
});

// DELETE /api/chat/sessions/:id
router.delete("/sessions/:id", (req, res) => {
  const db = req.app.get("db");
  db.prepare("DELETE FROM chat_sessions WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
