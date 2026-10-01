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
        garantía y del catálogo quedan arriba en el paso 2: ese es el dato que el modelo necesita y que RAG le
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
        En el paso 1, "monopatines" aparece marcado como <em>no está en los documentos</em>. Los puntajes del
        paso 2 son bajos y ninguna frase responde la pregunta. Un buen RAG debe decir "no lo sé" en vez de
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

  return (
    <div className="page lab">
      <header>
        <h1>Laboratorio: RAG paso a paso</h1>
        <p className="subtitle">
          Mira por dentro qué hace un sistema RAG con cada pregunta. Funciona en tu navegador, sin clave de API ni
          inteligencia artificial: la búsqueda es real y la respuesta final se arma copiando frases de los
          documentos. Elige un ejemplo o escribe tu pregunta.
        </p>
      </header>

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

      <LabStep n={1} title="La pregunta se convierte en términos">
        <p className="hint">
          Se pasa a minúsculas, se quitan tildes y palabras vacías ("la", "de", "los") y cada palabra se reduce a su
          raíz. El número indica el peso de cada término: las palabras raras pesan más que las comunes.
        </p>
        <QueryTerms question={question} query={query} />
      </LabStep>

      <LabStep n={2} title={`Se compara con los ${results.length} fragmentos y se eligen los ${topK} más parecidos`}>
        <p className="hint">
          Cada fragmento recibe un puntaje de similitud (0 a 1). Resaltadas, las palabras que comparte con la
          pregunta. Solo los que están por encima de la línea llegan al modelo.
        </p>
        <label className="topk">
          Fragmentos a recuperar (top-k): <strong>{topK}</strong>
          <input type="range" min={1} max={8} value={topK} onChange={(e) => setTopK(Number(e.target.value))} />
        </label>
        <Ranking results={results} topK={topK} />
      </LabStep>

      <LabStep n={3} title="Se arma el prompt con el contexto">
        <p className="hint">
          Las instrucciones, los fragmentos elegidos y la pregunta se juntan en un solo texto. Esto es exactamente lo
          que recibiría el modelo.
        </p>
        <details>
          <summary>Ver el prompt completo ({sources.length} fragmentos)</summary>
          <pre className="prompt">
            {`[Instrucciones del sistema]\n${RAG_SYSTEM_PROMPT}\n\n[Mensaje]\n${buildRagUserMessage(question, sources)}`}
          </pre>
        </details>
      </LabStep>

      <LabStep n={4} title="Se genera la respuesta">
        <p className="hint">
          Aquí, sin IA, se copian las frases de los fragmentos que más se parecen a la pregunta. Un modelo de
          lenguaje leería los mismos fragmentos, entendería la pregunta y redactaría una respuesta.
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
      </LabStep>
    </div>
  );
}

function LabStep({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="lab-step">
      <h2>
        <span className="badge">{n}</span> {title}
      </h2>
      {children}
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
