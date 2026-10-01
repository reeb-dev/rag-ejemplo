import { chunkDocuments, type ChunkOptions } from "./chunker.js";
import { TfIdfEmbedder, type Embedder } from "./embeddings.js";
import type { Generator } from "./generator.js";
import { buildRagUserMessage, NO_RAG_SYSTEM_PROMPT, RAG_SYSTEM_PROMPT } from "./prompt.js";
import type { RetrievedChunk, SourceDocument } from "./types.js";
import { InMemoryVectorStore } from "./vectorStore.js";

export type AnswerMode = "rag" | "sin-rag";

export type AnswerEvent =
  | { type: "sources"; sources: RetrievedChunk[] }
  | { type: "delta"; text: string }
  | { type: "done" };

/**
 * Une las piezas de RAG:
 *
 *   INDEXADO (una vez):    documentos → fragmentos → vectores → almacén
 *   CONSULTA (cada vez):   pregunta → vector → buscar top-k → prompt con contexto → LLM
 */
export class RagPipeline {
  private store: InMemoryVectorStore;
  private documents: SourceDocument[] = [];

  constructor(
    private readonly generator: Generator | null,
    embedder: Embedder = new TfIdfEmbedder(),
  ) {
    this.store = new InMemoryVectorStore(embedder);
  }

  indexDocuments(docs: SourceDocument[], options?: ChunkOptions): void {
    this.documents = docs;
    this.store.index(chunkDocuments(docs, options));
  }

  /** R de RAG: recuperar los fragmentos más relevantes. */
  retrieve(question: string, topK = 4): RetrievedChunk[] {
    return this.store.search(question, topK);
  }

  /** Recupera, aumenta y genera. Emite eventos para poder transmitirlos en streaming. */
  async *answer(question: string, mode: AnswerMode = "rag", topK = 4): AsyncGenerator<AnswerEvent> {
    const sources = mode === "rag" ? this.retrieve(question, topK) : [];
    yield { type: "sources", sources };

    if (!this.generator) {
      // Modo solo recuperación: sin clave de API mostramos qué se habría enviado al modelo.
      yield {
        type: "delta",
        text:
          mode === "rag"
            ? "_Modo solo recuperación (no hay clave de API configurada)._ " +
              "Estos son los fragmentos que se enviarían a Claude como contexto; " +
              "configura una clave de API para obtener una respuesta redactada."
            : "_Sin clave de API no se puede consultar al modelo sin RAG._",
      };
      yield { type: "done" };
      return;
    }

    const params =
      mode === "rag"
        ? { system: RAG_SYSTEM_PROMPT, userMessage: buildRagUserMessage(question, sources) }
        : { system: NO_RAG_SYSTEM_PROMPT, userMessage: question };

    for await (const text of this.generator.generate(params)) {
      yield { type: "delta", text };
    }
    yield { type: "done" };
  }

  stats() {
    return {
      documents: this.documents.map((d) => ({ id: d.id, title: d.title, chars: d.text.length })),
      chunks: this.store.size,
      model: this.generator?.model ?? null,
    };
  }

  get chunks() {
    return this.store.chunks;
  }
}
