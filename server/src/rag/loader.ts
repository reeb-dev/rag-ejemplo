import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { isKnowledgeFile, parseDocument, type SourceDocument } from "@rag/core";

/** Lee todos los .md y .txt de una carpeta (excepto README.md). */
export async function loadDocuments(dir: string): Promise<SourceDocument[]> {
  const files = (await readdir(dir)).filter(isKnowledgeFile).sort();
  return Promise.all(
    files.map(async (file) => parseDocument(file, await readFile(path.join(dir, file), "utf8"))),
  );
}
