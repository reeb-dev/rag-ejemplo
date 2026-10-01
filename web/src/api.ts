export interface Source {
  id: string;
  docId: string;
  docTitle: string;
  section: string;
  text: string;
  score: number;
}

export interface Health {
  ok: boolean;
  documents: { id: string; title: string; chars: number }[];
  chunks: number;
  model: string | null;
}

export type Mode = "rag" | "sin-rag";

export interface AskHandlers {
  onSources: (sources: Source[]) => void;
  onDelta: (text: string) => void;
}

export async function getHealth(): Promise<Health> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error(`El backend respondió ${res.status}`);
  return res.json();
}

/**
 * Llama a /api/ask y lee la respuesta como Server-Sent Events.
 * Usamos fetch (y no EventSource) porque necesitamos enviar un POST con la pregunta.
 */
export async function ask(
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
