import type { RetrievedChunk } from "./types.js";

/**
 * Paso "A" de RAG (Augmented): aumentar la pregunta con el contexto recuperado.
 *
 * Instrucciones clave para un buen RAG:
 *  - Responder SOLO con la información del contexto (reduce alucinaciones).
 *  - Decir "no lo sé" cuando el contexto no alcanza.
 *  - Citar las fuentes con [n] para que el usuario pueda verificar.
 */
export const RAG_SYSTEM_PROMPT = `Eres el asistente de atención al cliente de Bicicletas Aurora.
Responde en español, de forma clara y breve.

Usa únicamente la información de los fragmentos de <contexto>. Cuando una frase
se apoye en un fragmento, cítalo al final de la frase con su número, por ejemplo [2].
Si el contexto no contiene la respuesta, dilo con claridad y no inventes datos:
es preferible "no tengo esa información" a una respuesta incorrecta.`;

/** Sin contexto: sirve para comparar cómo responde el modelo "de memoria". */
export const NO_RAG_SYSTEM_PROMPT = `Eres el asistente de atención al cliente de Bicicletas Aurora.
Responde en español, de forma clara y breve.`;

export function buildRagUserMessage(question: string, chunks: RetrievedChunk[]): string {
  const context = chunks
    .map(
      (c, i) =>
        `<fragmento numero="${i + 1}" documento="${c.docId}" seccion="${c.section}">\n${c.text}\n</fragmento>`,
    )
    .join("\n\n");

  return `<contexto>\n${context || "(no se encontraron fragmentos relevantes)"}\n</contexto>\n\nPregunta: ${question}`;
}
