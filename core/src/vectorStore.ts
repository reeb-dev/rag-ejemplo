import { cosineSimilarity, type Embedder, type SparseVector } from "./embeddings.js";
import type { Chunk, RetrievedChunk } from "./types.js";

export interface ExplainedChunk extends RetrievedChunk {
  /** Términos de la consulta que también aparecen en el fragmento. */
  matched: string[];
}

/**
 * Paso 4 del indexado: guardar los vectores.
 *
 * Una "base de datos vectorial" en memoria. En producción se usaría pgvector,
 * Qdrant, Chroma, Pinecone, etc., que añaden persistencia y búsqueda aproximada
 * (ANN) para millones de vectores. Para unos cientos de fragmentos, recorrerlos
 * todos (búsqueda exacta) es instantáneo y mucho más fácil de entender.
 */
export class InMemoryVectorStore {
  private entries: { chunk: Chunk; vector: SparseVector }[] = [];

  constructor(private readonly embedder: Embedder) {}

  index(chunks: Chunk[]): void {
    // Se indexa el título de la sección junto al texto: mejora mucho la búsqueda.
    const texts = chunks.map(textForIndex);
    this.embedder.fit(texts);
    this.entries = chunks.map((chunk, i) => ({ chunk, vector: this.embedder.embed(texts[i]) }));
  }

  /** Devuelve los `k` fragmentos más parecidos a la consulta, de mayor a menor similitud. */
  search(query: string, k: number, minScore = 0.01): RetrievedChunk[] {
    const q = this.embedder.embed(query);
    return this.entries
      .map(({ chunk, vector }) => ({ ...chunk, score: cosineSimilarity(q, vector) }))
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  /**
   * Para aprender: puntúa TODOS los fragmentos (no solo los top-k) e indica qué
   * términos de la consulta comparte cada uno.
   */
  explain(query: string): { query: SparseVector; results: ExplainedChunk[] } {
    const q = this.embedder.embed(query);
    const results = this.entries
      .map(({ chunk, vector }) => ({
        ...chunk,
        score: cosineSimilarity(q, vector),
        matched: [...q.keys()].filter((t) => vector.has(t)),
      }))
      .sort((a, b) => b.score - a.score);
    return { query: q, results };
  }

  get size(): number {
    return this.entries.length;
  }

  get chunks(): Chunk[] {
    return this.entries.map((e) => e.chunk);
  }
}

function textForIndex(chunk: Chunk): string {
  return `${chunk.docTitle}\n${chunk.section}\n${chunk.text}`;
}
