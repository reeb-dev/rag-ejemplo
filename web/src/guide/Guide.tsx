import { useEffect, useMemo, useRef } from "react";
import { chapters, guideIndex, REPO_URL } from "./chapters";
import { renderMarkdown } from "./markdown";

/** Lector de la guía: índice lateral + capítulo renderizado desde docs/*.md. */
export function Guide({ slug, anchor }: { slug: string | null; anchor: string | null }) {
  const index = chapters.findIndex((c) => c.slug === slug);
  const chapter = index >= 0 ? chapters[index] : null;
  const html = useMemo(() => renderMarkdown(chapter ? chapter.markdown : guideIndex), [chapter]);
  const ref = useRef<HTMLElement>(null);

  // Ir al ancla pedida (o al principio) y dibujar los diagramas Mermaid.
  useEffect(() => {
    const target = anchor ? document.getElementById(decodeURIComponent(anchor)) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);

    const diagrams = ref.current?.querySelectorAll<HTMLElement>("pre.mermaid");
    if (!diagrams?.length) return;
    let cancelled = false;
    import("mermaid").then(({ default: mermaid }) => {
      if (cancelled) return;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "neutral" });
      mermaid.run({ nodes: [...diagrams] }).catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [html, anchor]);

  // Enlaces internos de un capítulo (#seccion) sin romper la ruta de la guía.
  const onClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    if (href?.startsWith("#ancla:")) {
      e.preventDefault();
      document.getElementById(decodeURIComponent(href.slice(7)))?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const prev = index > 0 ? chapters[index - 1] : null;
  const next = index >= 0 ? chapters[index + 1] : chapters[0];

  return (
    <div className="guide">
      <nav className="toc" aria-label="Capítulos">
        <a href="#/guia" className={chapter ? "" : "current"}>
          Índice
        </a>
        <ol>
          {chapters.map((c) => (
            <li key={c.slug}>
              <a href={`#/guia/${c.slug}`} className={c.slug === slug ? "current" : ""}>
                <span className="n">{c.number}</span> {c.title}
              </a>
            </li>
          ))}
        </ol>
        <a href="#/" className="try">
          ▶ Probar la demo
        </a>
      </nav>

      <article className="doc">
        <section ref={ref} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
        <footer className="doc-nav">
          {prev ? <a href={`#/guia/${prev.slug}`}>← {prev.title}</a> : <span />}
          {next && <a href={`#/guia/${next.slug}`}>{next.title} →</a>}
        </footer>
        {chapter && (
          <p className="edit">
            <a href={`${REPO_URL}/blob/main/docs/${chapter.slug}.md`} target="_blank" rel="noreferrer">
              Ver este capítulo en GitHub
            </a>
          </p>
        )}
      </article>
    </div>
  );
}
