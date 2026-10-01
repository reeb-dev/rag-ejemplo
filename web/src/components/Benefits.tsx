const DOCS = "https://github.com/reeb-dev/rag-ejemplo/blob/main/docs";

const BENEFITS: { title: string; text: string; tryIt?: string }[] = [
  {
    title: "Usa tus propios datos sin reentrenar",
    text: "El modelo responde sobre documentos que nunca vio: aquí, una empresa inventada.",
    tryIt: "¿Cuánto dura la garantía de la batería de la E1?",
  },
  {
    title: "Menos alucinaciones",
    text: "Responde solo con el contexto recuperado y, si no está, lo dice en lugar de inventar.",
    tryIt: "¿Venden monopatines eléctricos?",
  },
  {
    title: "Siempre actualizado",
    text: "Para que sepa algo nuevo basta con cambiar los documentos y volver a indexar.",
  },
  {
    title: "Respuestas verificables",
    text: "Cada dato lleva una cita [n] al fragmento del que sale, para comprobarlo con un clic.",
  },
  {
    title: "Más barato",
    text: "Solo envía al modelo los fragmentos relevantes, no todos los documentos en cada pregunta.",
  },
  {
    title: "Control de acceso",
    text: "La búsqueda la hace tu código, así que puedes filtrar qué documentos ve cada usuario.",
  },
  {
    title: "Independiente del modelo",
    text: "El conocimiento vive en tus documentos: puedes cambiar de modelo sin perder nada.",
  },
  {
    title: "Fácil de empezar y de mejorar",
    text: "Un RAG básico se arma en un día y cada pieza (fragmentos, búsqueda, prompt) se mejora por separado.",
  },
];

/** Los beneficios de RAG, con preguntas para comprobarlos en la demo. */
export function Benefits({ onTry }: { onTry: (question: string) => void }) {
  return (
    <section className="benefits">
      <h2>¿Por qué usar RAG?</h2>
      <p className="hint">
        RAG (<em>Retrieval-Augmented Generation</em>) busca en tus documentos los fragmentos relevantes y se los da
        al modelo como contexto antes de responder. Estas son sus principales ventajas.
      </p>
      <ol>
        {BENEFITS.map((b) => (
          <li key={b.title}>
            <strong>{b.title}</strong>
            <span>{b.text}</span>
            {b.tryIt && (
              <button type="button" className="link" onClick={() => onTry(b.tryIt!)}>
                Probarlo: “{b.tryIt}”
              </button>
            )}
          </li>
        ))}
      </ol>
      <p className="more">
        Más detalle, comparación con fine-tuning y contexto largo, y casos de uso en{" "}
        <a href={`${DOCS}/03-beneficios-y-ventajas.md`} target="_blank" rel="noreferrer">
          Beneficios y ventajas de RAG
        </a>
        . Toda la guía, desde cero:{" "}
        <a href={`${DOCS}/README.md`} target="_blank" rel="noreferrer">
          documentación en español
        </a>
        .
      </p>
    </section>
  );
}
