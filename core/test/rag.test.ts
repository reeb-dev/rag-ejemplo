import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { chunkDocument } from "../src/chunker.js";
import { cosineSimilarity, TfIdfEmbedder, tokenize } from "../src/embeddings.js";
import type { GenerateParams, Generator } from "../src/generator.js";
import { isKnowledgeFile, parseDocument } from "../src/documents.js";
import { RagPipeline, type AnswerEvent } from "../src/pipeline.js";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data");
const docs = readdirSync(dataDir)
  .filter(isKnowledgeFile)
  .sort()
  .map((f) => parseDocument(f, readFileSync(path.join(dataDir, f), "utf8")));

describe("chunker", () => {
  it("corta por secciones y guarda la ruta de títulos", () => {
    const chunks = chunkDocument({
      id: "doc.md",
      title: "Doc",
      text: "# Doc\n\nIntro.\n\n## Parte A\n\nTexto A.\n\n## Parte B\n\nTexto B.",
    });
    expect(chunks.map((c) => c.section)).toEqual(["Doc", "Doc › Parte A", "Doc › Parte B"]);
    expect(chunks[1].text).toBe("Texto A.");
  });

  it("parte secciones largas respetando el tamaño máximo", () => {
    const paragraph = "Una oración de prueba bastante larga. ".repeat(10).trim();
    const text = `# Largo\n\n${Array(6).fill(paragraph).join("\n\n")}`;
    const chunks = chunkDocument({ id: "l.md", title: "Largo", text }, { maxChars: 500, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(500 + 50 + 2);
  });
});

describe("documentos", () => {
  it("usa el primer título como nombre y descarta los README", () => {
    expect(parseDocument("a.md", "texto\n# Hola mundo\nmás").title).toBe("Hola mundo");
    expect(parseDocument("notas.txt", "sin título").title).toBe("notas");
    expect(isKnowledgeFile("README.md")).toBe(false);
    expect(isKnowledgeFile("01-empresa.md")).toBe(true);
  });
});

describe("embeddings", () => {
  it("normaliza tildes, plurales y stopwords", () => {
    expect(tokenize("Las Devoluciones de la garantía")).toEqual(tokenize("devolución garantia"));
  });

  it("textos parecidos tienen mayor similitud que textos distintos", () => {
    const e = new TfIdfEmbedder();
    const corpus = ["envío gratis a todo el país", "garantía del cuadro de por vida", "horario de las tiendas"];
    e.fit(corpus);
    const q = e.embed("¿el envío es gratis?");
    const scores = corpus.map((t) => cosineSimilarity(q, e.embed(t)));
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[0]).toBeGreaterThan(scores[2]);
  });
});

describe("pipeline sobre los documentos de ejemplo", () => {
  const cases: [string, string][] = [
    ["¿Cuánto dura la garantía del cuadro?", "03-garantia.md"],
    ["¿Puedo devolver un casco usado?", "04-envios-y-devoluciones.md"],
    ["¿Cuánto cuesta el service completo en el taller?", "05-taller-y-preguntas-frecuentes.md"],
    ["¿Cuánto pesa la bicicleta plegable?", "02-catalogo.md"],
    ["¿Quién fundó la empresa?", "01-empresa.md"],
  ];

  it.each(cases)("'%s' recupera primero %s", async (question, expectedDoc) => {
    const rag = new RagPipeline(null);
    rag.indexDocuments(docs);
    expect(rag.retrieve(question, 3)[0].docId).toBe(expectedDoc);
  });

  it("envía al modelo la pregunta con los fragmentos numerados", async () => {
    const calls: GenerateParams[] = [];
    const fake: Generator = {
      model: "falso",
      async *generate(params) {
        calls.push(params);
        yield "respuesta [1]";
      },
    };
    const rag = new RagPipeline(fake);
    rag.indexDocuments(docs);

    const events: AnswerEvent[] = [];
    for await (const ev of rag.answer("¿Hay envío gratis?")) events.push(ev);

    expect(events.map((e) => e.type)).toEqual(["sources", "delta", "done"]);
    expect(calls[0].userMessage).toContain('<fragmento numero="1"');
    expect(calls[0].userMessage).toContain("Pregunta: ¿Hay envío gratis?");
    expect(calls[0].system).toMatch(/únicamente/);
  });

  it("en modo sin-rag no envía contexto", async () => {
    const calls: GenerateParams[] = [];
    const fake: Generator = {
      model: "falso",
      async *generate(params) {
        calls.push(params);
        yield "ok";
      },
    };
    const rag = new RagPipeline(fake);
    rag.indexDocuments(docs);
    for await (const _ of rag.answer("¿Hay envío gratis?", "sin-rag"));
    expect(calls[0].userMessage).toBe("¿Hay envío gratis?");
  });
});

describe("respuesta extractiva (sin modelo)", () => {
  const answerFor = async (question: string) => {
    const rag = new RagPipeline(null);
    rag.indexDocuments(docs);
    let text = "";
    for await (const ev of rag.answer(question)) if (ev.type === "delta") text += ev.text;
    return text;
  };

  it("copia la frase que responde, con su cita", async () => {
    expect(await answerFor("¿Puedo pagar en cuotas?")).toMatch(/12 cuotas sin interés.*\[\d\]/);
  });

  it("dice que no encontró nada si la pregunta habla de algo que no está", async () => {
    expect(await answerFor("¿Venden monopatines eléctricos?")).toMatch(/No encontré información/);
  });
});

describe("explain", () => {
  it("puntúa todos los fragmentos y marca los términos compartidos", () => {
    const rag = new RagPipeline(null);
    rag.indexDocuments(docs);
    const { results } = rag.explain("¿Hay envío gratis?");
    expect(results.length).toBe(rag.chunks.length);
    expect(results[0].matched).toContain("envio");
  });
});
