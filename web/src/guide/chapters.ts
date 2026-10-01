// Los capítulos de docs/ se empaquetan con la web al compilar: la guía en la web y
// en GitHub siempre muestran el mismo texto.
const files = import.meta.glob("../../../docs/*.md", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

export interface Chapter {
  slug: string;
  number: string;
  title: string;
  markdown: string;
}

export const chapters: Chapter[] = Object.entries(files)
  .map(([path, markdown]) => {
    const slug = path.split("/").pop()!.replace(/\.md$/, "");
    const heading = markdown.match(/^#\s+(?:(\d+)\.\s+)?(.+)$/m);
    return { slug, number: heading?.[1] ?? "", title: heading?.[2] ?? slug, markdown };
  })
  .filter((c) => /^\d/.test(c.slug))
  .sort((a, b) => a.slug.localeCompare(b.slug));

export const guideIndex = files["../../../docs/README.md"] ?? "";

export const REPO_URL = "https://github.com/reeb-dev/rag-ejemplo";
