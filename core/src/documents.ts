import type { SourceDocument } from "./types.js";

/**
 * Paso 1 del indexado: convertir un archivo en un documento.
 * El título es el primer encabezado "# ..." o, si no hay, el nombre del archivo.
 * (Leer los archivos depende del entorno: `fs` en Node, `import.meta.glob` en el navegador.)
 */
export function parseDocument(id: string, text: string): SourceDocument {
  const heading = text.match(/^#\s+(.+)$/m);
  return { id, title: heading ? heading[1].trim() : id.replace(/\.[^.]+$/, ""), text };
}

/** Los README describen la carpeta de datos y no forman parte de la base de conocimiento. */
export function isKnowledgeFile(name: string): boolean {
  return /\.(md|txt)$/i.test(name) && name.toLowerCase() !== "readme.md";
}
