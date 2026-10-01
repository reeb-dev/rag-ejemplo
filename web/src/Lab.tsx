import { useMemo, useState, type ReactNode } from "react";
import {
  buildRagUserMessage,
  extractiveAnswer,
  RAG_SYSTEM_PROMPT,
  RagPipeline,
  splitWords,
  toTerm,
  type ExplainedChunk,
} from "@rag/core";
import { loadBundledDocuments } from "./engine";

interface Scenario {
  title: string;
  question: string;
  topK: number;
  lesson: ReactNode;
}

const SCENARIOS: Scenario[] = [
  {
    title: "1. Un dato que solo está en los documentos",
    question: "¿Cuánto dura la garantía de la batería de la E1?",
    topK: 4,
    lesson: (
      <>
        Bicicletas Aurora no existe, así que ningún modelo sabe esto de memoria. Mira cómo los fragmentos de
        garantía y del catálogo quedan arriba en la etapa Recuperar: ese es el dato que el modelo necesita y que RAG le
        alcanza.
      </>
    ),
  },
  {
    title: "2. Cuando la respuesta no está",
    question: "¿Venden monopatines eléctricos?",
    topK: 4,
    lesson: (
      <>
        En la etapa Recuperar, "monopatines" aparece marcado como <em>no está en los documentos</em> y
        los puntajes son bajos y ninguna frase responde la pregunta. Un buen RAG debe decir "no lo sé" en vez de
        inventar.
      </>
    ),
  },
  {
    title: "3. La respuesta está repartida",
    question: "¿Cuánto cuesta la Aurora Cargo y es gratis el envío?",
    topK: 1,
    lesson: (
      <>
        Hacen falta dos documentos: el catálogo y la política de envíos. Con top-k = 1 solo llega uno. Sube el
        top-k a 4 y mira cómo entra el fragmento de la Aurora Cargo. Elegir bien top-k es parte del oficio.
      </>
    ),
  },
  {
    title: "4. Mismo significado, otras palabras",
    question: "¿Me reintegran la plata si no me gusta?",
    topK: 4,
    lesson: (
      <>
        Quiere decir "¿puedo devolverla y que me reembolsen?", pero no comparte palabras con los documentos y la
        búsqueda no encuentra nada. Este ejemplo busca por palabras (TF-IDF). Los <em>embeddings</em> de un RAG
        real buscan por significado y sí lo encontrarían. Prueba ahora con "¿Puedo devolver la bicicleta?".
      </>
    ),
  },
  {
    title: "5. Preguntas frecuentes",
    question: "¿Puedo pagar en cuotas?",
    topK: 4,
    lesson: (
      <>
        La respuesta exacta está en las preguntas frecuentes. Cuando los documentos están bien escritos, con una
        pregunta y su respuesta juntas, la búsqueda es fácil. Mejorar los documentos suele mejorar más un RAG que
        cualquier técnica.
      </>
    ),
  },
  {
    title: "6. Para esto sirve el modelo de lenguaje",
    question: "¿Abren los domingos?",
    topK: 4,
    lesson: (
      <>
        La búsqueda encuentra el horario, pero la respuesta sin IA copia frases sueltas, incluida la de lunes a
        viernes. Un LLM leería lo mismo y respondería "No, salvo la tienda de Palermo en verano". La búsqueda
        encuentra la información; el modelo la entiende y la redacta.
      </>
    ),
  },
];

/** Laboratorio: muestra por dentro cada paso de RAG para una pregunta, sin llamar a ninguna API. */
export function Lab() {
  const rag = useMemo(() => {
    const p = new RagPipeline(null);
    p.indexDocuments(loadBundledDocuments());
    return p;
  }, []);

  const [scenario, setScenario] = useState(0);
  const [question, setQuestion] = useState(SCENARIOS[0].question);
  const [draft, setDraft] = useState(SCENARIOS[0].question);
  const [topK, setTopK] = useState(SCENARIOS[0].topK);

  const pick = (i: number) => {
    setScenario(i);
    setQuestion(SCENARIOS[i].question);
    setDraft(SCENARIOS[i].question);
    setTopK(SCENARIOS[i].topK);
  };

  const { query, results } = useMemo(() => rag.explain(question), [rag, question]);
  const sources = results.filter((r) => r.score > 0).slice(0, topK);
  const answer = extractiveAnswer(question, query, sources);
  const current = scenario >= 0 ? SCENARIOS[scenario] : null;

  const stats = rag.stats();
  const chunksPerDoc = stats.documents.map((d) => ({
    ...d,
    chunks: rag.chunks.filter((c) => c.docId === d.id).length,
  }));
  const exampleChunk = rag.chunks.find((c) => c.section.endsWith("Cobertura")) ?? rag.chunks[0];

  return (
    <div className="page lab">
      <header>
        <h1>Laboratorio: RAG paso a paso</h1>
        <p className="subtitle">
          Aquí puedes ver qué hace un sistema RAG por dentro con cada pregunta, y para qué sirve cada etapa. Funciona en
          tu navegador, sin clave de API: la búsqueda es real y la respuesta final se arma copiando frases de los
          documentos.
        </p>
      </header>

      <section className="overview" aria-label="Las etapas de RAG">
        <h2>Las etapas de RAG</h2>
        <p className="hint">
          RAG significa <em>Retrieval-Augmented Generation</em>: generación (G) aumentada (A) con información recuperada
          (R). Antes de responder, el sistema busca en tus documentos lo que necesita y se lo da al modelo. Tiene una
          etapa de preparación que se hace una sola vez y tres etapas que se repiten con cada pregunta.
        </p>
        <ol className="stages">
          {STAGES.map((st) => (
            <li key={st.id}>
              <a href={`#ancla-${st.id}`} onClick={(e) => scrollTo(e, st.id)}>
                <span className="stage-letter">{st.letter}</span>
                <strong>{st.name}</strong>
                <span>{st.short}</span>
                <small>{st.when}</small>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <h2 className="try-title">Prueba con un ejemplo</h2>
      <div className="scenarios">
        {SCENARIOS.map((s, i) => (
          <button key={s.title} className={`scenario ${i === scenario ? "current" : ""}`} onClick={() => pick(i)}>
            <strong>{s.title}</strong>
            <span>“{s.question}”</span>
          </button>
        ))}
      </div>

      {current && (
        <div className="lesson">
          <strong>Qué observar:</strong> {current.lesson}
        </div>
      )}

      <form
        className="ask"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          setScenario(-1);
          setQuestion(draft.trim());
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Pregunta" />
        <button type="submit">Analizar</button>
      </form>

      <Stage stage={STAGES[0]}>
        <p>
          Los <strong>{stats.documents.length} documentos</strong> de Bicicletas Aurora se cortaron en{" "}
          <strong>{stats.chunks} fragmentos</strong>, uno por sección, y cada fragmento se convirtió en un vector. Esto
          pasó una sola vez, al abrir la página, antes de tu pregunta.
        </p>
        <table className="docs-table">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Fragmentos</th>
            </tr>
          </thead>
          <tbody>
            {chunksPerDoc.map((d) => (
              <tr key={d.id}>
                <td>
                  {d.title} <small>({d.id})</small>
                </td>
                <td>{d.chunks}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <details>
          <summary>Ver un fragmento de ejemplo</summary>
          <div className="chunk-example">
            <div className="where">
              {exampleChunk.docId} › {exampleChunk.section}
            </div>
            <pre>{exampleChunk.text.replace(/\*\*/g, "")}</pre>
          </div>
        </details>
      </Stage>

      <Stage stage={STAGES[1]}>
        <h3>a) La pregunta se convierte en términos</h3>
        <p className="hint">
          La pregunta pasa por el mismo proceso que los fragmentos: minúsculas, sin tildes, sin palabras vacías ("la",
          "de", "los") y cada palabra reducida a su raíz. El número es el peso del término: las palabras raras pesan
          más que las comunes.
        </p>
        <QueryTerms question={question} query={query} />

        <h3>b) Se buscan los fragmentos más parecidos</h3>
        <p className="hint">
          Se compara el vector de la pregunta con el de cada uno de los {results.length} fragmentos y se ordenan por
          similitud (0 a 1). Resaltadas, las palabras que comparten. Solo los que quedan por encima de la línea pasan a
          la siguiente etapa.
        </p>
        <label className="topk">
          Fragmentos a recuperar (top-k): <strong>{topK}</strong>
          <input type="range" min={1} max={8} value={topK} onChange={(e) => setTopK(Number(e.target.value))} />
        </label>
        <Ranking results={results} topK={topK} />
      </Stage>

      <Stage stage={STAGES[2]}>
        <p className="hint">El prompt que recibe el modelo tiene tres partes:</p>
        <div className="prompt-parts">
          <div className="part instr">
            <span className="part-label">1. Instrucciones</span>
            <pre>{RAG_SYSTEM_PROMPT}</pre>
          </div>
          <div className="part ctx">
            <span className="part-label">2. Contexto: los {sources.length} fragmentos recuperados</span>
            {sources.length ? (
              <pre>{buildRagUserMessage(question, sources).split("\n\nPregunta:")[0]}</pre>
            ) : (
              <p className="hint">No se recuperó ningún fragmento: el modelo no tendría contexto.</p>
            )}
          </div>
          <div className="part q">
            <span className="part-label">3. La pregunta</span>
            <pre>Pregunta: {question}</pre>
          </div>
        </div>
      </Stage>

      <Stage stage={STAGES[3]}>
        <p className="hint">
          Sin clave de API, aquí no hay un modelo de lenguaje: la respuesta se arma copiando las frases de los fragmentos
          que más se parecen a la pregunta, con su cita.
        </p>
        <div className="answer lab-answer">
          {answer ? (
            answer.split("\n\n").map((line, i) => <p key={i}>{line}</p>)
          ) : (
            <p>
              <em>No encontré información sobre eso en los documentos.</em> Así debería responder un buen RAG en vez de
              inventar.
            </p>
          )}
        </div>
        <p className="hint">
          ¿Quieres ver la respuesta redactada por Claude? Prueba la misma pregunta en la <a href="#/">demo</a> con tu
          clave de API.
        </p>
      </Stage>

      <section className="recap">
        <h2>En resumen</h2>
        <p>
          <strong>Preparar</strong> deja los documentos listos para buscar. <strong>Recuperar</strong> encuentra lo
          relevante para cada pregunta. <strong>Aumentar</strong> se lo entrega al modelo junto con instrucciones claras.{" "}
          <strong>Generar</strong> convierte eso en una respuesta con fuentes. Si una respuesta sale mal, casi siempre se
          puede saber en qué etapa falló mirando esta página. Para seguir aprendiendo:{" "}
          <a href="#/guia/02-como-funciona">cómo funciona RAG en detalle</a> y{" "}
          <a href="#/guia/07-sacarle-el-jugo">cómo mejorar cada etapa</a>.
        </p>
      </section>
    </div>
  );
}

function scrollTo(e: React.MouseEvent, id: string) {
  e.preventDefault();
  document.getElementById(`etapa-${id}`)?.scrollIntoView({ behavior: "smooth" });
}

interface StageInfo {
  id: string;
  letter: string;
  name: string;
  short: string;
  when: string;
  what: ReactNode;
  why: ReactNode;
  real: ReactNode;
}

const STAGES: StageInfo[] = [
  {
    id: "preparar",
    letter: "0",
    name: "Preparar (indexar)",
    short: "Cortar los documentos en fragmentos y convertirlos en vectores.",
    when: "Una sola vez",
    what: (
      <>
        Los documentos se dividen en fragmentos chicos, de un solo tema, y cada fragmento se convierte en un vector: una
        lista de números que representa de qué habla. Los vectores se guardan para poder buscarlos rápido.
      </>
    ),
    why: (
      <>
        Buscar en fragmentos chicos permite encontrar el párrafo exacto en lugar de un documento entero. Y como se hace
        una sola vez, cada pregunta después es rápida y barata.
      </>
    ),
    real: (
      <>
        Un modelo de embeddings (por ejemplo, Voyage AI) genera vectores que capturan el significado, y se guardan en una
        base de datos vectorial como pgvector o Qdrant. Aquí, para que funcione sin internet, se usa TF-IDF: un vector
        de palabras con pesos.
      </>
    ),
  },
  {
    id: "recuperar",
    letter: "R",
    name: "Recuperar",
    short: "Buscar los fragmentos más parecidos a la pregunta.",
    when: "Con cada pregunta",
    what: (
      <>
        La pregunta se convierte en un vector con el mismo método que los fragmentos, y se buscan los <em>k</em>{" "}
        fragmentos cuyo vector se parece más (top-k).
      </>
    ),
    why: (
      <>
        Es la etapa más importante: si el fragmento con la respuesta no aparece aquí, ningún modelo puede responder bien.
        La mayoría de los errores de un RAG nacen en esta etapa.
      </>
    ),
    real: (
      <>
        Se combina la búsqueda por significado (embeddings) con la búsqueda por palabras clave, y a veces un modelo de
        re-ranking reordena los candidatos. Ver <a href="#/guia/07-sacarle-el-jugo">Sácale el jugo a RAG</a>.
      </>
    ),
  },
  {
    id: "aumentar",
    letter: "A",
    name: "Aumentar",
    short: "Agregar esos fragmentos al prompt, junto con la pregunta.",
    when: "Con cada pregunta",
    what: (
      <>
        Se arma el texto que recibe el modelo: instrucciones ("responde solo con el contexto, cita las fuentes, si no
        está di que no lo sabes"), los fragmentos recuperados numerados y la pregunta.
      </>
    ),
    why: (
      <>
        El modelo no busca nada por su cuenta: solo sabe lo que está en este texto. Las instrucciones evitan que invente
        y la numeración permite que cite de dónde saca cada dato.
      </>
    ),
    real: (
      <>
        Es igual a lo que ves aquí. Se puede mejorar con <em>prompt caching</em> para las partes fijas o con la función de
        citas nativas de la API de Claude.
      </>
    ),
  },
  {
    id: "generar",
    letter: "G",
    name: "Generar",
    short: "El modelo lee el contexto y redacta la respuesta.",
    when: "Con cada pregunta",
    what: (
      <>
        Un modelo de lenguaje (como Claude) lee los fragmentos, entiende la pregunta y redacta una respuesta en lenguaje
        natural, citando de qué fragmento sale cada dato.
      </>
    ),
    why: (
      <>
        La búsqueda encuentra la información, pero no la entiende: puede traer frases de más o de menos. El modelo
        combina datos de varios fragmentos, descarta lo que no aplica y responde exactamente lo que se preguntó.
      </>
    ),
    real: (
      <>
        Se llama a un LLM con el prompt de la etapa anterior, normalmente con <em>streaming</em> para que la respuesta
        aparezca palabra por palabra. Es lo que hace la <a href="#/">demo</a> cuando le das una clave de API.
      </>
    ),
  },
];

function Stage({ stage, children }: { stage: StageInfo; children: ReactNode }) {
  return (
    <section className="lab-step" id={`etapa-${stage.id}`}>
      <h2>
        <span className="badge">{stage.letter}</span> {stage.name}
        <small className="when">{stage.when}</small>
      </h2>
      <dl className="explainer">
        <div>
          <dt>Qué hace</dt>
          <dd>{stage.what}</dd>
        </div>
        <div>
          <dt>Por qué importa</dt>
          <dd>{stage.why}</dd>
        </div>
        <div>
          <dt>En un RAG real</dt>
          <dd>{stage.real}</dd>
        </div>
      </dl>
      <div className="stage-body">
        <h3 className="in-example">En este ejemplo</h3>
        {children}
      </div>
    </section>
  );
}

function QueryTerms({ question, query }: { question: string; query: Map<string, number> }) {
  const words = splitWords(question);
  return (
    <div className="terms">
      {words.map((word, i) => {
        const term = toTerm(word);
        if (!term)
          return (
            <span key={i} className="term dropped" title="Palabra vacía: se descarta">
              {word}
            </span>
          );
        const weight = query.get(term);
        if (weight === undefined)
          return (
            <span key={i} className="term unknown" title="Esta palabra no aparece en ningún documento">
              {word} → {term} <small>no está en los documentos</small>
            </span>
          );
        return (
          <span key={i} className="term">
            {word} → <strong>{term}</strong> <small>{weight.toFixed(2)}</small>
          </span>
        );
      })}
    </div>
  );
}

function Ranking({ results, topK }: { results: ExplainedChunk[]; topK: number }) {
  return (
    <ol className="ranking">
      {results.map((r, i) => {
        const chosen = i < topK && r.score > 0;
        return (
          <li key={r.id} className={chosen ? "chosen" : "rest"}>
            {i === topK && <div className="cutoff">Hasta aquí llega al modelo (top-k = {topK})</div>}
            <div className="source-head">
              <span className="num">{i + 1}.</span>
              <span className="where">
                {r.docId} › {r.section}
              </span>
              <span className="score">
                <span className="bar" style={{ width: `${Math.min(100, r.score * 100)}%` }} />
                {r.score.toFixed(2)}
              </span>
            </div>
            {chosen && <Highlighted text={r.text} matched={new Set(r.matched)} />}
          </li>
        );
      })}
    </ol>
  );
}

function Highlighted({ text, matched }: { text: string; matched: Set<string> }) {
  const parts = text.replace(/\*\*/g, "").split(/([\p{L}\p{N}]+)/u);
  return (
    <pre>
      {parts.map((part, i) => {
        const term = /[\p{L}\p{N}]/u.test(part) ? toTerm(part) : null;
        return term && matched.has(term) ? <mark key={i}>{part}</mark> : part;
      })}
    </pre>
  );
}
