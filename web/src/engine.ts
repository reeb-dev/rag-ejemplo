import { ClaudeGenerator, parseDocument, isKnowledgeFile, RagPipeline } from "@rag/core";
import type { AnswerMode, RetrievedChunk } from "@rag/core";

export type Source = RetrievedChunk;
export type Mode = AnswerMode;

export interface EngineInfo {
  documents: { id: string; title: string }[];
  chunks: number;
  model: string | null;
}

export interface AskHandlers {
  onSources: (sources: Source[]) => void;
  onDelta: (text: string) => void;
}

/**
 * La app puede ejecutar el RAG en dos lugares:
 *  - "server":  el backend de Node hace todo y la clave de API vive en el servidor (.env).
 *  - "browser": no hay backend (GitHub Pages). Los documentos se empaquetan con la web,
 *               la búsqueda corre en el navegador y Claude se llama con la clave que
 *               cada visitante ingresa.
 */
export interface Engine {
  kind: "server" | "browser";
  info: EngineInfo;
  ask(question: string, mode: Mode, topK: number, handlers: AskHandlers, signal?: AbortSignal): Promise<void>;
}

export async function createEngine(apiKey: string): Promise<Engine> {
  if (!import.meta.env.VITE_STATIC) {
    const server = await tryServerEngine();
    if (server) return server;
  }
  return createBrowserEngine(apiKey);
}

// ---------- Motor en el navegador ----------

// Vite incluye el contenido de data/*.md dentro del bundle al compilar.
const files = import.meta.glob("../../data/*.{md,txt}", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

/** Los documentos de data/ que vienen dentro de la web. */
export function loadBundledDocuments() {
  return Object.entries(files)
    .map(([p, text]) => [p.split("/").pop()!, text] as const)
    .filter(([name]) => isKnowledgeFile(name))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, text]) => parseDocument(name, text));
}

export function createBrowserEngine(apiKey: string): Engine {
  const docs = loadBundledDocuments();

  const generator = apiKey.trim() ? new ClaudeGenerator({ apiKey: apiKey.trim(), browser: true }) : null;
  const rag = new RagPipeline(generator);
  rag.indexDocuments(docs);

  const stats = rag.stats();
  return {
    kind: "browser",
    info: { documents: stats.documents, chunks: stats.chunks, model: stats.model },
    async ask(question, mode, topK, handlers, signal) {
      for await (const ev of rag.answer(question, mode, topK)) {
        if (signal?.aborted) return;
        if (ev.type === "sources") handlers.onSources(ev.sources);
        else if (ev.type === "delta") handlers.onDelta(ev.text);
      }
    },
  };
}

// ---------- Motor en el servidor ----------

async function tryServerEngine(): Promise<Engine | null> {
  try {
    const res = await fetch("/api/health", { signal: AbortSignal.timeout(2000) });
    if (!res.ok || !res.headers.get("content-type")?.includes("json")) return null;
    const info: EngineInfo = await res.json();
    return { kind: "server", info, ask: askServer };
  } catch {
    return null;
  }
}

/**
 * Llama a /api/ask y lee la respuesta como Server-Sent Events.
 * Usamos fetch (y no EventSource) porque necesitamos enviar un POST con la pregunta.
 */
async function askServer(
  question: string,
  mode: Mode,
  topK: number,
  handlers: AskHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, mode, topK }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`El backend respondió ${res.status}`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const raw of events) {
      const event = raw.match(/^event: (.+)$/m)?.[1];
      const data = raw.match(/^data: (.*)$/m)?.[1];
      if (!event || data === undefined) continue;
      const payload = JSON.parse(data);
      if (event === "sources") handlers.onSources(payload);
      else if (event === "delta") handlers.onDelta(payload);
      else if (event === "error") throw new Error(payload.message);
    }
  }
}
