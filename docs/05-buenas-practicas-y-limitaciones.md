# 5. Buenas prácticas y limitaciones

RAG es simple de empezar, pero la calidad depende de los detalles. Esta es una lista de lo
que más impacto tiene, ordenada de "hazlo siempre" a "cuando lo necesites".

## Buenas prácticas

### Datos
- **La calidad de las respuestas no supera la de los documentos.** Documentos
  desactualizados, contradictorios o ambiguos producen respuestas igual de malas.
- **Limpia el formato:** quita menús, pies de página y texto repetido de PDFs y webs antes
  de indexar.
- **Guarda metadatos** (documento, sección, fecha, autor, permisos): sirven para citar,
  filtrar y depurar.

### Fragmentos (*chunking*)
- Empieza con fragmentos de **200–500 palabras** con un pequeño solapamiento, y ajusta.
- **Respeta la estructura** del documento (títulos, párrafos, filas de tabla) en lugar de
  cortar a ciegas cada N caracteres.
- **Agrega contexto a cada fragmento:** el título del documento y de la sección. Anthropic
  publicó una técnica llamada *Contextual Retrieval* que va más allá: usa un LLM para
  escribir 1–2 frases que sitúan cada fragmento dentro de su documento antes de indexarlo,
  lo que reduce mucho los fallos de recuperación.

### Recuperación
- **Búsqueda híbrida:** combina embeddings (significado) con búsqueda por palabras clave
  como BM25 (nombres propios, códigos, números exactos). Cada una cubre las debilidades de
  la otra.
- **Re-ranking:** trae, por ejemplo, 20 candidatos rápidos y usa un modelo de re-ranking
  para quedarte con los 4 mejores.
- **Reescribir la pregunta:** en un chat, "¿y cuánto pesa?" no sirve para buscar; usa el
  LLM para convertirla en "¿cuánto pesa la Aurora Plegable P20?" antes de recuperar.
- **Umbral mínimo de similitud:** mejor no mandar nada que mandar fragmentos irrelevantes.

### Prompt y generación
- Instruye al modelo a **responder solo con el contexto** y a **decir que no sabe** cuando
  falte información.
- **Delimita** el contexto (etiquetas XML como `<fragmento>`) y **numera** los fragmentos
  para poder citarlos.
- **Pide citas.** La API de Claude tiene además una función de *citations* que devuelve
  automáticamente qué parte exacta de cada documento respalda cada frase.
- Usa **prompt caching** si una parte grande del prompt se repite entre preguntas.

### Evaluación (lo que más se olvida)
- Arma un **conjunto de preguntas de prueba** con la respuesta esperada y el documento
  correcto (como los tests en [`core/test/rag.test.ts`](../core/test/rag.test.ts)).
- **Mide por separado** las dos mitades:
  - *Recuperación:* ¿el fragmento correcto está entre los top-k? (*recall@k*, MRR)
  - *Generación:* ¿la respuesta es fiel al contexto, correcta y completa?
- Herramientas como **Ragas** automatizan métricas como fidelidad (*faithfulness*) y
  relevancia, usando un LLM como juez.
- Cada cambio (tamaño de fragmento, top-k, modelo de embeddings) se valida contra ese
  conjunto, no "a ojo".

## Limitaciones y riesgos

| Limitación | Qué pasa | Cómo mitigarlo |
| --- | --- | --- |
| **Recuperación fallida** | Si el fragmento correcto no se encuentra, el modelo no puede responder bien (o responde con el fragmento equivocado). | Búsqueda híbrida, re-ranking, mejores fragmentos, evaluación. |
| **Preguntas que requieren todo el corpus** | "¿Cuántos productos cuestan más de 1.000 USD?" necesita mirar todo, no 4 fragmentos. | Herramientas (SQL, código) o resúmenes precalculados. |
| **Información contradictoria** | Dos documentos dicen cosas distintas. | Metadatos de fecha/versión y priorizar lo más reciente. |
| **Inyección de prompt** | Un documento malicioso contiene "ignora tus instrucciones y...". | Tratar el contexto como datos, delimitarlo, no indexar fuentes no confiables sin revisar, y no dar al modelo permisos peligrosos. |
| **Filtrado de datos sensibles** | El asistente le muestra a un usuario un documento que no debería ver. | Filtrar por permisos **en la búsqueda**, antes de llegar al modelo. |
| **Latencia** | Búsqueda + generación suma tiempo. | Streaming, caché, índices ANN, modelos más rápidos. |

---

← [4. Arquitectura del ejemplo](04-arquitectura-del-ejemplo.md) · Siguiente: [6. Ejercicios →](06-ejercicios.md)
