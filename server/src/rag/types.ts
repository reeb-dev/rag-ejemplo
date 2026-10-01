/** Un documento original de la base de conocimiento (un archivo). */
export interface SourceDocument {
  id: string;
  title: string;
  text: string;
}

/** Un fragmento ("chunk") de un documento: la unidad que se indexa y se recupera. */
export interface Chunk {
  id: string;
  docId: string;
  docTitle: string;
  /** Ruta de títulos que contiene al fragmento, p. ej. "Política de garantía › Cobertura". */
  section: string;
  text: string;
}

/** Un fragmento recuperado junto con su puntuación de similitud (0 a 1). */
export interface RetrievedChunk extends Chunk {
  score: number;
}
