import type { ReactNode } from "react";
import type { AnswerState } from "../Demo";

interface Props {
  title: string;
  hint: string;
  state: AnswerState;
  variant?: "muted";
}

export function AnswerPanel({ title, hint, state, variant }: Props) {
  return (
    <section className={`panel ${variant ?? ""}`}>
      <header>
        <h2>{title}</h2>
        <p>{hint}</p>
      </header>
      {state.error ? (
        <p className="error">Error: {state.error}</p>
      ) : state.text ? (
        <div className="answer">{renderAnswer(state.text)}</div>
      ) : state.loading ? (
        <p className="placeholder">Esperando respuesta…</p>
      ) : (
        <p className="placeholder">Haz una pregunta para empezar.</p>
      )}
    </section>
  );
}

/**
 * Formato mínimo: párrafos, **negrita**, _cursiva_, `código` y citas [n]
 * resaltadas para que se vea de qué fragmento sale cada dato.
 */
function renderAnswer(text: string): ReactNode {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i}>
      {para.split(/(\[\d+(?:,\s*\d+)*\]|\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g).map((part, j) => {
        if (/^\[\d/.test(part)) return <a key={j} className="cite" href={`#fuente-${part.match(/\d+/)![0]}`}>{part}</a>;
        if (part.startsWith("**")) return <strong key={j}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("_") && part.length > 2) return <em key={j}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`")) return <code key={j}>{part.slice(1, -1)}</code>;
        return part;
      })}
    </p>
  ));
}
