import { tokenize, type SparseVector } from "./embeddings.js";
import type { RetrievedChunk } from "./types.js";

const MIN_COVERAGE = 0.4;

/**
 * Una "G" sin modelo de lenguaje, para usar la demo sin clave de API.
 *
 * En vez de redactar, elige las frases de los fragmentos recuperados que más
 * términos comparten con la pregunta y las copia tal cual, con su cita [n].
 * Sirve para ver que la información correcta llegó hasta el paso de generación;
 * un LLM haría lo mismo pero entendiendo la pregunta y redactando una respuesta.
 */
export function extractiveAnswer(
  question: string,
  query: SparseVector,
  sources: RetrievedChunk[],
  maxSentences = 3,
): string {
  // Peso de cada término de la pregunta. Los que no aparecen en ningún documento
  // ("monopatines") no están en el vector, pero importan: si nadie los menciona,
  // probablemente los documentos no responden la pregunta.
  const known = [...query.values()];
  const unknownWeight = known.length ? Math.max(...known) : 1;
  const weights = new Map<string, number>();
  for (const term of tokenize(question)) weights.set(term, query.get(term) ?? unknownWeight);
  const total = [...weights.values()].reduce((a, b) => a + b, 0);

  const candidates = sources.flatMap((source, i) => {
    // Los títulos de la sección dan contexto: "Precio: 1.680 USD" bajo "Aurora Cargo".
    const sectionTerms = new Set(tokenize(source.section));
    return splitSentences(source.text).map((sentence) => {
      const terms = new Set(tokenize(sentence));
      let score = 0;
      for (const [term, weight] of weights) {
        if (terms.has(term)) score += weight;
        else if (sectionTerms.has(term)) score += weight * 0.5;
      }
      // Favorece a los fragmentos mejor rankeados ante un empate.
      return { sentence, cite: i + 1, coverage: total ? score / total : 0, score: score * (1 + source.score) };
    });
  });

  const seen = new Set<string>();
  const best = candidates
    // Solo frases que cubren una parte importante de lo que se pregunta.
    .filter((c) => c.coverage >= MIN_COVERAGE)
    .sort((a, b) => b.score - a.score)
    .filter((c) => !seen.has(c.sentence) && seen.add(c.sentence))
    .slice(0, maxSentences);

  if (!best.length) return "";
  return best.map((c) => `${c.sentence} [${c.cite}]`).join("\n\n");
}

/** Corta un fragmento en frases legibles, quitando el formato Markdown. */
export function splitSentences(text: string): string[] {
  const units: string[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((l) => l.trim() && !/^\s*\|?\s*:?-{3,}/.test(l));
    const isList = lines.every((l) => /^\s*([-*]|\d+\.|\|)\s*/.test(l) || /^\s{2,}/.test(l));
    if (isList) {
      // Cada viñeta o fila de tabla es una unidad (las líneas indentadas continúan la anterior).
      for (const l of lines) {
        if (/^\s{2,}\S/.test(l) && !/^\s*([-*]|\d+\.)\s/.test(l) && units.length) units[units.length - 1] += " " + l.trim();
        else units.push(l);
      }
    } else {
      units.push(lines.join(" "));
    }
  }

  const sentences = units
    .map((u) =>
      u
        .replace(/^\s*(?:[-*]|\d+\.)\s+/, "")
        .replace(/\*\*|__|`/g, "")
        .replace(/^\|\s*|\s*\|$/g, "")
        .replace(/\s*\|\s*/g, ": ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .flatMap((u) => u.split(/(?<=[.!])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/))
    .flatMap((u) => u.split(/(?<=\?)\s+/));

  // Preguntas frecuentes: una pregunta va junto con su respuesta.
  const merged: string[] = [];
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].endsWith("?") && i + 1 < sentences.length) merged.push(`${sentences[i]} ${sentences[++i]}`);
    else merged.push(sentences[i]);
  }
  return merged.filter((s) => s.length > 15);
}
