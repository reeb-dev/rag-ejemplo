/**
 * Prueba el RAG desde la terminal, sin frontend:
 *   npm run query -w server -- "¿Cuánto dura la garantía de la batería?"
 */
import { config } from "./config.js";
import { ClaudeGenerator, hasClaudeCredentials } from "./rag/generator.js";
import { RagPipeline } from "./rag/pipeline.js";

const question = process.argv.slice(2).join(" ").trim();
if (!question) {
  console.error('Uso: npm run query -w server -- "tu pregunta"');
  process.exit(1);
}

const rag = new RagPipeline(hasClaudeCredentials() ? new ClaudeGenerator() : null);
await rag.indexDirectory(config.dataDir);

for await (const ev of rag.answer(question)) {
  if (ev.type === "sources") {
    console.log("\nFragmentos recuperados:");
    ev.sources.forEach((s, i) =>
      console.log(`  [${i + 1}] ${s.score.toFixed(3)}  ${s.docId} › ${s.section}`),
    );
    console.log("\nRespuesta:");
  } else if (ev.type === "delta") {
    process.stdout.write(ev.text);
  }
}
console.log();
