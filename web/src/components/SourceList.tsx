import type { Source } from "../engine";

/** Los fragmentos recuperados: lo que realmente "leyó" el modelo antes de responder. */
export function SourceList({ sources, loading }: { sources: Source[]; loading: boolean }) {
  if (loading) return <p className="placeholder">Buscando fragmentos…</p>;
  if (!sources.length) return null;
  return (
    <section className="sources">
      <h2>Fragmentos recuperados</h2>
      <p className="hint">
        Esto es lo que se agregó al prompt. La barra indica la similitud con la pregunta (0 a 1).
      </p>
      <ol>
        {sources.map((s, i) => (
          <li key={s.id} id={`fuente-${i + 1}`} className="source">
            <div className="source-head">
              <span className="num">[{i + 1}]</span>
              <span className="where">
                {s.docId} › {s.section}
              </span>
              <span className="score" title="Similitud coseno">
                <span className="bar" style={{ width: `${Math.min(100, s.score * 100)}%` }} />
                {s.score.toFixed(2)}
              </span>
            </div>
            <pre>{s.text}</pre>
          </li>
        ))}
      </ol>
    </section>
  );
}
