import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { SourceDocument } from "./types.js";

const SUPPORTED = new Set([".md", ".txt"]);

/**
 * Paso 1 del indexado: cargar los documentos.
 * Lee todos los .md y .txt de una carpeta (excepto README.md, que describe la carpeta).
 */
export async function loadDocuments(dir: string): Promise<SourceDocument[]> {
  const files = (await readdir(dir))
    .filter((f) => SUPPORTED.has(path.extname(f).toLowerCase()))
    .filter((f) => f.toLowerCase() !== "readme.md")
    .sort();

  return Promise.all(
    files.map(async (file) => {
      const text = await readFile(path.join(dir, file), "utf8");
      const heading = text.match(/^#\s+(.+)$/m);
      return {
        id: file,
        title: heading ? heading[1].trim() : path.basename(file, path.extname(file)),
        text,
      };
    }),
  );
}
