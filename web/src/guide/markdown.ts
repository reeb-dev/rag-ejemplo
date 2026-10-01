import { Marked } from "marked";
import { REPO_URL } from "./chapters";

/** Igual que GitHub: así los enlaces con #ancla de los .md funcionan también en la web. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
    .replace(/ /g, "-");
}

/**
 * Convierte los enlaces relativos de los .md:
 *  - "06-guia-practica.md#paso-1"  → ruta de la guía en la web
 *  - "README.md"                   → índice de la guía
 *  - "../core/src/chunker.ts"      → archivo en GitHub
 */
function resolveHref(href: string): { href: string; external: boolean } {
  if (/^(https?:|mailto:)/.test(href)) return { href, external: true };
  if (href.startsWith("#")) return { href: `#ancla:${href.slice(1)}`, external: false };

  const [path, anchor] = href.split("#");
  const chapter = path.match(/^(?:\.\/)?(\d\d-[\w-]+)\.md$/);
  if (chapter) return { href: `#/guia/${chapter[1]}${anchor ? `#${anchor}` : ""}`, external: false };
  if (/^(?:\.\/)?README\.md$/.test(path)) return { href: "#/guia", external: false };

  const repoPath = path.replace(/^\.\.\//, "").replace(/^\.\//, "docs/");
  const kind = /\.\w+$/.test(repoPath) ? "blob" : "tree";
  return { href: `${REPO_URL}/${kind}/main/${repoPath}${anchor ? `#${anchor}` : ""}`, external: true };
}

const marked = new Marked({
  gfm: true,
  renderer: {
    heading({ tokens, depth }) {
      const html = this.parser.parseInline(tokens);
      return `<h${depth} id="${slugify(html)}">${html}</h${depth}>\n`;
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const r = resolveHref(href);
      const t = title ? ` title="${title}"` : "";
      return r.external
        ? `<a href="${r.href}"${t} target="_blank" rel="noreferrer">${text}</a>`
        : `<a href="${r.href}"${t}>${text}</a>`;
    },
    code({ text, lang }) {
      if (lang === "mermaid") return `<pre class="mermaid">${escapeHtml(text)}</pre>`;
      return `<pre><code class="language-${lang ?? "text"}">${escapeHtml(text)}</code></pre>`;
    },
  },
});

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
