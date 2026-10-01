import { useEffect, useRef, useState } from "react";
import { createEngine, type Engine, type Mode, type Source } from "./engine";
import { AnswerPanel } from "./components/AnswerPanel";
import { Benefits } from "./components/Benefits";
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

export function Demo() {
  const [apiKey, setApiKey] = useState(loadKey);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(4);
  const [compare, setCompare] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [rag, setRag] = useState<AnswerState>(EMPTY);
  const [noRag, setNoRag] = useState<AnswerState>(EMPTY);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    createEngine(apiKey).then((e) => !cancelled && setEngine(e));
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  async function run(mode: Mode, q: string, set: (fn: (s: AnswerState) => AnswerState) => void, signal: AbortSignal) {
    set(() => ({ ...EMPTY, loading: true }));
    try {
      if (!engine) throw new Error("La app todavía se está cargando.");
      await engine.ask(
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

  async function submit(q = question, withComparison = compare) {
    const text = q.trim();
    if (!text) return;
    setQuestion(text);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStep("retrieve");
    setNoRag(EMPTY);
    const jobs = [run("rag", text, setRag, controller.signal)];
    if (withComparison) jobs.push(run("sin-rag", text, setNoRag, controller.signal));
    await Promise.all(jobs);
    if (!controller.signal.aborted) setStep("done");
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Demo: un asistente con RAG</h1>
          <p className="subtitle">
            Pregúntale al asistente de <strong>Bicicletas Aurora</strong>, una empresa ficticia que ningún
            modelo conoce. Todo lo que sepa lo saca de sus documentos.
          </p>
          <p className="subtitle">
            ¿Primera vez con RAG? Lee <a href="#/guia/01-que-es-rag">qué es</a> o sigue la{" "}
            <a href="#/guia">guía completa</a>.
          </p>
        </div>
        <StatusBadge engine={engine} />
      </header>

      {engine?.kind === "browser" && <ApiKeyBox apiKey={apiKey} onChange={setApiKey} />}

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

      <Benefits
        onTry={(q) => {
          setCompare(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
          submit(q, true);
        }}
      />

    </div>
  );
}

function StatusBadge({ engine }: { engine: Engine | null }) {
  if (!engine) return <div className="status">Cargando…</div>;
  const { info } = engine;
  return (
    <div className="status">
      <span>
        {info.documents.length} documentos · {info.chunks} fragmentos
      </span>
      <span>{engine.kind === "server" ? "RAG en el servidor (Node)" : "RAG en tu navegador"}</span>
      <span className={info.model ? "ok" : "warn"}>
        {info.model ? `Modelo: ${info.model}` : "Solo recuperación (sin clave de API)"}
      </span>
    </div>
  );
}

const KEY_STORAGE = "rag-ejemplo:anthropic-key";

function loadKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

/**
 * En la versión estática (GitHub Pages) no hay servidor que guarde la clave:
 * cada visitante puede usar la suya. Se guarda solo en este navegador.
 */
function ApiKeyBox({ apiKey, onChange }: { apiKey: string; onChange: (key: string) => void }) {
  const [draft, setDraft] = useState(apiKey);
  const save = (value: string) => {
    try {
      if (value) localStorage.setItem(KEY_STORAGE, value);
      else localStorage.removeItem(KEY_STORAGE);
    } catch {
      // Sin almacenamiento disponible: la clave dura solo esta sesión.
    }
    onChange(value);
  };
  return (
    <details className="apikey" open={!apiKey}>
      <summary>{apiKey ? "Clave de API configurada ✓" : "Opcional: usa tu clave de API de Anthropic para generar respuestas"}</summary>
      <p>
        Sin clave la demo funciona en <strong>modo solo recuperación</strong>: verás qué fragmentos se enviarían al
        modelo. Con tu clave, tu navegador llama directamente a la API de Claude. La clave se guarda solo en este
        navegador y no pasa por ningún otro servidor. Consíguela en{" "}
        <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
          console.anthropic.com
        </a>
        .
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(draft.trim());
        }}
      >
        <input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="sk-ant-..."
          aria-label="Clave de API de Anthropic"
          autoComplete="off"
        />
        <button type="submit">Guardar</button>
        {apiKey && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setDraft("");
              save("");
            }}
          >
            Borrar
          </button>
        )}
      </form>
    </details>
  );
}
