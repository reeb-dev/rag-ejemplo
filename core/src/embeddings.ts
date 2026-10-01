/**
 * Paso 3 del indexado: convertir texto en vectores ("embeddings").
 *
 * En un RAG de producción se usa un modelo de embeddings (Voyage AI, OpenAI,
 * Cohere, o uno local como `bge-m3`) que captura el *significado* del texto:
 * "devolver" y "reembolso" quedan cerca aunque no compartan letras.
 *
 * Este ejemplo usa TF-IDF, una técnica clásica que funciona sin internet, sin
 * claves y sin descargar modelos, para que el proyecto arranque con un solo
 * `npm install`. La idea es la misma: cada texto se vuelve un vector y la
 * similitud entre vectores mide cuán relacionado está un fragmento con la
 * pregunta. Para cambiarlo por embeddings reales basta con implementar la
 * interfaz `Embedder` (ver docs/04-arquitectura-del-ejemplo.md).
 */

/** Vector disperso: solo guardamos las dimensiones (términos) distintas de cero. */
export type SparseVector = Map<string, number>;

export interface Embedder {
  /** Aprende lo que necesite del corpus (vocabulario, pesos IDF, etc.). */
  fit(texts: string[]): void;
  /** Convierte un texto en un vector normalizado (longitud 1). */
  embed(text: string): SparseVector;
}

// Palabras muy frecuentes que no aportan significado a la búsqueda.
const STOPWORDS = new Set(
  (
    "a al algo algun alguna algunas alguno algunos ante antes como con contra cual cuales cuando " +
    "de del desde donde durante e el ella ellas ellos en entre era es esa esas ese eso esos esta " +
    "estan estas este esto estos fue fueron ha hay hasta la las le les lo los mas me mi mis mucho " +
    "muy nada ni no nos nuestra nuestro o os otra otro para pero poco por porque puede pueden que " +
    "quien se sea ser si sin sobre su sus tambien te tiene tienen tu tus un una unas uno unos y ya yo " +
    "cuanto cuanta cuantos cuantas cual hace hacer the of and to in is"
  ).split(" "),
);

/** Normaliza y separa un texto en términos: minúsculas, sin tildes, sin stopwords, con raíz aproximada. */
export function tokenize(text: string): string[] {
  return splitWords(text)
    .map(toTerm)
    .filter((t): t is string => t !== null);
}

/** Separa un texto en palabras (sin normalizar). */
export function splitWords(text: string): string[] {
  return text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Convierte una palabra en el término que se indexa, o null si se descarta (stopword o muy corta). */
export function toTerm(word: string): string | null {
  const t = word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita tildes: "garantía" -> "garantia"
  if (t.length <= 1 || STOPWORDS.has(t) || !/^[a-z0-9ñ]+$/.test(t)) return null;
  return stem(t);
}

/**
 * "Stemming" muy simple para español: quita plurales y recorta a 6 letras para
 * que "devolver", "devolución" y "devoluciones" compartan la raíz "devolu"/"devolv".
 * Es tosco a propósito; los modelos de embeddings reales no lo necesitan.
 */
function stem(token: string): string {
  if (/^\d+$/.test(token)) return token;
  let t = token;
  if (t.length > 4 && t.endsWith("es")) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith("s")) t = t.slice(0, -1);
  return t.slice(0, 6);
}

export class TfIdfEmbedder implements Embedder {
  private idf = new Map<string, number>();

  fit(texts: string[]): void {
    const docFreq = new Map<string, number>();
    for (const text of texts) {
      for (const term of new Set(tokenize(text))) {
        docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
      }
    }
    const n = texts.length;
    this.idf.clear();
    for (const [term, df] of docFreq) {
      // IDF suavizado: los términos raros pesan más que los que aparecen en todas partes.
      this.idf.set(term, Math.log((n + 1) / (df + 1)) + 1);
    }
  }

  embed(text: string): SparseVector {
    const tf = new Map<string, number>();
    for (const term of tokenize(text)) tf.set(term, (tf.get(term) ?? 0) + 1);

    const vector: SparseVector = new Map();
    for (const [term, count] of tf) {
      const idf = this.idf.get(term);
      if (idf !== undefined) vector.set(term, (1 + Math.log(count)) * idf);
    }
    return normalize(vector);
  }
}

function normalize(v: SparseVector): SparseVector {
  let norm = 0;
  for (const x of v.values()) norm += x * x;
  norm = Math.sqrt(norm);
  if (norm === 0) return v;
  for (const [k, x] of v) v.set(k, x / norm);
  return v;
}

/** Similitud coseno entre dos vectores normalizados: 1 = idénticos, 0 = nada en común. */
export function cosineSimilarity(a: SparseVector, b: SparseVector): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, x] of small) {
    const y = large.get(k);
    if (y !== undefined) dot += x * y;
  }
  return dot;
}
