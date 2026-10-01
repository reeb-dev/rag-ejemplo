import { chunkDocuments, type ChunkOptions } from "./chunker.js";
import { TfIdfEmbedder, type Embedder } from "./embeddings.js";
import { extractiveAnswer } from "./extractive.js";
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
      // Sin clave de API: respuesta "extractiva", armada con frases copiadas de los fragmentos.
      yield { type: "delta", text: this.answerWithoutModel(question, mode, sources) };
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

  /** Puntuación de todos los fragmentos para una pregunta (para el laboratorio paso a paso). */
  explain(question: string) {
    return this.store.explain(question);
  }

  private answerWithoutModel(question: string, mode: AnswerMode, sources: RetrievedChunk[]): string {
    if (mode === "sin-rag") {
      return (
        "_Sin RAG y sin modelo no hay de dónde sacar la respuesta._ Un LLM sin documentos tendría que " +
        "responder de memoria, y ningún modelo conoce a Bicicletas Aurora: en el mejor caso diría que no lo " +
        "sabe y en el peor inventaría un dato. Configura una clave de API para ver qué responde realmente."
      );
    }
    const answer = extractiveAnswer(question, this.store.explain(question).query, sources);
    const note =
      "\n\n_Respuesta extractiva, sin IA: son las frases de los fragmentos que más se parecen a la " +
      "pregunta, copiadas tal cual. Con una clave de API, Claude las leería y redactaría la respuesta._";
    return answer
      ? answer + note
      : "_No encontré información sobre eso en los documentos._ Un buen sistema RAG debería decir esto " +
          "en lugar de inventar una respuesta.";
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
