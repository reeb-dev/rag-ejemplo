import type { Chunk, SourceDocument } from "./types.js";

export interface ChunkOptions {
  /** Tamaño máximo aproximado de cada fragmento, en caracteres. */
  maxChars: number;
  /** Caracteres que se repiten entre fragmentos consecutivos para no cortar ideas a la mitad. */
  overlap: number;
}

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { maxChars: 700, overlap: 120 };

/**
 * Paso 2 del indexado: dividir cada documento en fragmentos.
 *
 * Estrategia:
 *  1. Se corta por secciones de Markdown (#, ##, ###) para que cada fragmento
 *     hable de un solo tema.
 *  2. Si una sección es más larga que `maxChars`, se parte por párrafos y,
 *     si hace falta, por oraciones, con un pequeño solapamiento.
 *  3. Cada fragmento guarda la ruta de títulos ("Garantía › Cobertura") para
 *     dar contexto tanto al buscador como al modelo.
 */
export function chunkDocument(
  doc: SourceDocument,
  options: ChunkOptions = DEFAULT_CHUNK_OPTIONS,
): Chunk[] {
  const chunks: Chunk[] = [];
  for (const section of splitSections(doc)) {
    for (const piece of splitBySize(section.body, options)) {
      chunks.push({
        id: `${doc.id}#${chunks.length}`,
        docId: doc.id,
        docTitle: doc.title,
        section: section.path.join(" › "),
        text: piece,
      });
    }
  }
  return chunks;
}

export function chunkDocuments(docs: SourceDocument[], options?: ChunkOptions): Chunk[] {
  return docs.flatMap((d) => chunkDocument(d, options));
}

interface Section {
  path: string[];
  body: string;
}

function splitSections(doc: SourceDocument): Section[] {
  const sections: Section[] = [];
  const headings: string[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    if (body) sections.push({ path: headings.length ? [...headings] : [doc.title], body });
    buffer = [];
  };

  for (const line of doc.text.split(/\r?\n/)) {
    const m = line.match(/^(#{1,3})\s+(.+)$/);
    if (m) {
      flush();
      const level = m[1].length;
      headings.length = level - 1;
      headings[level - 1] = m[2].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

function splitBySize(text: string, { maxChars, overlap }: ChunkOptions): string[] {
  if (text.length <= maxChars) return [text];

  // Unidades atómicas: párrafos, y oraciones si un párrafo es demasiado largo.
  const units = text
    .split(/\n\s*\n/)
    .flatMap((p) => (p.length <= maxChars ? [p.trim()] : p.split(/(?<=[.!?])\s+/)))
    .filter(Boolean);

  const pieces: string[] = [];
  let current = "";
  for (const unit of units) {
    if (current && current.length + unit.length + 2 > maxChars) {
      pieces.push(current);
      const tail = current.slice(-overlap);
      // El solapamiento empieza en un límite de palabra para que se lea bien.
      current = tail.slice(tail.indexOf(" ") + 1) + "\n\n" + unit;
    } else {
      current = current ? `${current}\n\n${unit}` : unit;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}
