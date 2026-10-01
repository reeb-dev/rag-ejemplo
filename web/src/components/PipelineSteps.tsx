export type Step = "idle" | "retrieve" | "augment" | "generate" | "done";

const STEPS: { id: Exclude<Step, "idle" | "done">; label: string; detail: string }[] = [
  { id: "retrieve", label: "1. Recuperar", detail: "Busca los fragmentos más parecidos a la pregunta" },
  { id: "augment", label: "2. Aumentar", detail: "Los agrega al prompt como contexto" },
  { id: "generate", label: "3. Generar", detail: "El modelo responde usando ese contexto" },
];

/** Muestra en qué paso de R-A-G está la consulta actual. */
export function PipelineSteps({ step }: { step: Step }) {
  const current = STEPS.findIndex((s) => s.id === step);
  return (
    <ol className="steps" aria-label="Pasos de RAG">
      {STEPS.map((s, i) => {
        const state = step === "done" || i < current ? "done" : i === current ? "active" : "pending";
        return (
          <li key={s.id} className={`step ${state}`}>
            <strong>{s.label}</strong>
            <span>{s.detail}</span>
          </li>
        );
      })}
    </ol>
  );
}
