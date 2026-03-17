import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import { initDB } from "./db.js";
import chatRouter from "./routes/chat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const port = process.env.FORGE_PORT || 3000;
const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

const app = express();
app.use(express.json());

if (!isProd) {
  app.use(cors());
}

const db = initDB();
app.set("db", db);
app.set("ollamaUrl", ollamaUrl);

app.use("/api/chat", chatRouter);

app.get("/api/health", async (_req, res) => {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const { models } = await response.json();
      res.json({ status: "ok", ollama: { available: true, models: models?.length ?? 0 } });
    } else {
      res.json({ status: "ok", ollama: { available: false } });
    }
  } catch {
    res.json({ status: "ok", ollama: { available: false } });
  }
});

if (isProd) {
  const distPath = path.resolve(__dirname, "../forge-fe/dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(port, () => {
  const apiUrl = `http://localhost:${port}`;
  console.log(`
  Forge API    → ${apiUrl}/api
  Ollama       → ${ollamaUrl}
  ${isProd ? `UI           → ${apiUrl}` : "UI           → http://localhost:5173 (vite dev)"}
  `);
});
