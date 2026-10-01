import cors from "cors";
import express from "express";
import path from "node:path";
import { config, hasClaudeCredentials } from "./config.js";
import { ClaudeGenerator, RagPipeline, type AnswerMode } from "@rag/core";
import { loadDocuments } from "./rag/loader.js";

const generator = hasClaudeCredentials() ? new ClaudeGenerator({ model: process.env.CLAUDE_MODEL }) : null;
const rag = new RagPipeline(generator);
rag.indexDocuments(await loadDocuments(config.dataDir));

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ...rag.stats() });
});

/** Lista los fragmentos indexados (útil para ver cómo se dividieron los documentos). */
app.get("/api/chunks", (_req, res) => {
  res.json(rag.chunks);
});

/** Solo el paso de recuperación, sin llamar al modelo. */
app.post("/api/search", (req, res) => {
  const { question, topK } = req.body ?? {};
  if (typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "Falta 'question'." });
    return;
  }
  res.json(rag.retrieve(question, clampTopK(topK)));
});

/**
 * Pregunta completa (recuperar + generar) con la respuesta en streaming
 * mediante Server-Sent Events: eventos `sources`, `delta`, `done` y `error`.
 */
app.post("/api/ask", async (req, res) => {
  const { question, mode, topK } = req.body ?? {};
  if (typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "Falta 'question'." });
    return;
  }
  const answerMode: AnswerMode = mode === "sin-rag" ? "sin-rag" : "rag";

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const send = (event: string, data: unknown) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    for await (const ev of rag.answer(question.trim(), answerMode, clampTopK(topK))) {
      if (ev.type === "sources") send("sources", ev.sources);
      else if (ev.type === "delta") send("delta", ev.text);
      else send("done", {});
    }
  } catch (err) {
    console.error(err);
    send("error", { message: err instanceof Error ? err.message : String(err) });
  } finally {
    res.end();
  }
});

// En producción el backend también sirve el frontend compilado.
if (config.hasWebBuild) {
  app.use(express.static(config.webDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(config.webDist, "index.html")));
}

app.listen(config.port, () => {
  const { documents, chunks } = rag.stats();
  console.log(`RAG listo en http://localhost:${config.port}`);
  console.log(`  ${documents.length} documentos → ${chunks} fragmentos indexados`);
  console.log(
    generator
      ? `  Generación con ${generator.model}`
      : "  Sin ANTHROPIC_API_KEY: modo solo recuperación (ver .env.example)",
  );
});

function clampTopK(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 1), 10) : 4;
}
