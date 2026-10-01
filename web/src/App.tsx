import { useEffect, useRef, useState } from "react";
import { ask, getHealth, type Health, type Mode, type Source } from "./api";
import { AnswerPanel } from "./components/AnswerPanel";
import { PipelineSteps, type Step } from "./components/PipelineSteps";
import { SourceList } from "./components/SourceList";

const EXAMPLES = [
  "¿Cuánto dura la garantía de la batería de la E1?",
  "¿Puedo devolver un casco que ya usé?",
  "¿Abren los domingos?",
  "¿Cuánto cuesta el envío de una plegable?",
  "¿Qué descuento tienen los socios del Club Aurora?",
  "¿Venden monopatines eléctricos?",
];

export interface AnswerState {
  text: string;
  sources: Source[];
  loading: boolean;
  error: string | null;
}

const EMPTY: AnswerState = { text: "", sources: [], loading: false, error: null };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(4);
  const [compare, setCompare] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [rag, setRag] = useState<AnswerState>(EMPTY);
  const [noRag, setNoRag] = useState<AnswerState>(EMPTY);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getHealth().then(setHealth, (e: Error) => setHealthError(e.message));
  }, []);

  async function run(mode: Mode, q: string, set: (fn: (s: AnswerState) => AnswerState) => void, signal: AbortSignal) {
    set(() => ({ ...EMPTY, loading: true }));
    try {
      await ask(
        q,
        mode,
        topK,
        {
          onSources: (sources) => {
            set((s) => ({ ...s, sources }));
            if (mode === "rag") setStep("augment");
          },
          onDelta: (text) => {
            set((s) => ({ ...s, text: s.text + text }));
            if (mode === "rag") setStep("generate");
          },
        },
        signal,
      );
      set((s) => ({ ...s, loading: false }));
    } catch (e) {
      if (signal.aborted) return;
      set((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }

  async function submit(q = question) {
    const text = q.trim();
    if (!text) return;
    setQuestion(text);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStep("retrieve");
    setNoRag(EMPTY);
    const jobs = [run("rag", text, setRag, controller.signal)];
    if (compare) jobs.push(run("sin-rag", text, setNoRag, controller.signal));
    await Promise.all(jobs);
    if (!controller.signal.aborted) setStep("done");
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>RAG de ejemplo</h1>
          <p className="subtitle">
            Pregúntale al asistente de <strong>Bicicletas Aurora</strong>, una empresa ficticia que ningún
            modelo conoce. Todo lo que sepa lo saca de sus documentos.
          </p>
        </div>
        <StatusBadge health={health} error={healthError} />
      </header>

      <PipelineSteps step={step} />

      <form
        className="ask"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Escribe una pregunta sobre Bicicletas Aurora…"
          aria-label="Pregunta"
        />
        <button type="submit" disabled={!question.trim() || rag.loading}>
          {rag.loading ? "Pensando…" : "Preguntar"}
        </button>
      </form>

      <div className="controls">
        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} className="chip" onClick={() => submit(ex)} type="button">
              {ex}
            </button>
          ))}
        </div>
        <div className="options">
          <label>
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
            Comparar con una respuesta <em>sin</em> RAG
          </label>
          <label>
            Fragmentos a recuperar (top-k): <strong>{topK}</strong>
            <input type="range" min={1} max={8} value={topK} onChange={(e) => setTopK(Number(e.target.value))} />
          </label>
        </div>
      </div>

      <main className={compare ? "answers two" : "answers"}>
        <AnswerPanel title="Con RAG" hint="Recupera fragmentos y responde citándolos." state={rag} />
        {compare && (
          <AnswerPanel
            title="Sin RAG"
            hint="Misma pregunta, sin contexto: el modelo solo puede adivinar."
            state={noRag}
            variant="muted"
          />
        )}
      </main>

      <SourceList sources={rag.sources} loading={rag.loading && rag.sources.length === 0} />

      <footer className="footer">
        ¿Cómo funciona? Lee la{" "}
        <a href="https://github.com/reeb-dev/rag-ejemplo/tree/main/docs" target="_blank" rel="noreferrer">
          documentación del proyecto
        </a>
        .
      </footer>
    </div>
  );
}

function StatusBadge({ health, error }: { health: Health | null; error: string | null }) {
  if (error) return <div className="status error">Backend sin conexión</div>;
  if (!health) return <div className="status">Conectando…</div>;
  return (
    <div className="status">
      <span>
        {health.documents.length} documentos · {health.chunks} fragmentos
      </span>
      <span className={health.model ? "ok" : "warn"}>
        {health.model ? `Modelo: ${health.model}` : "Solo recuperación (sin API key)"}
      </span>
    </div>
  );
}
