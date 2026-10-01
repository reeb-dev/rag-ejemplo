# 9. Glosario y recursos

## Glosario

| Término | Significado |
| --- | --- |
| **LLM** | *Large Language Model*, modelo de lenguaje grande (Claude, por ejemplo). |
| **RAG** | *Retrieval-Augmented Generation*: buscar información relevante y dársela al LLM para que responda. |
| **Chunk / fragmento** | Trozo de un documento que se indexa y recupera por separado. |
| **Chunking** | Proceso de dividir documentos en fragmentos. |
| **Overlap / solapamiento** | Texto repetido entre fragmentos consecutivos para no cortar ideas. |
| **Embedding** | Vector numérico que representa el significado de un texto. |
| **Modelo de embeddings** | Modelo que convierte texto en embeddings (Voyage AI, `bge-m3`, etc.). |
| **TF-IDF** | *Term Frequency – Inverse Document Frequency*: vector de palabras ponderadas por su rareza. Lo usa este ejemplo. |
| **BM25** | Función de búsqueda por palabras clave, mejora de TF-IDF; la base de muchos buscadores. |
| **Similitud coseno** | Medida de cuán parecidos son dos vectores (1 = iguales, 0 = nada en común). |
| **Base de datos vectorial** | Base optimizada para buscar vectores cercanos (pgvector, Qdrant, Chroma, Pinecone...). |
| **ANN** | *Approximate Nearest Neighbors*: búsqueda aproximada y muy rápida de vectores cercanos. |
| **Top-k** | Cantidad de fragmentos que se recuperan por pregunta. |
| **Búsqueda híbrida** | Combinar búsqueda semántica (embeddings) y por palabras clave (BM25). |
| **Re-ranking** | Reordenar los candidatos con un modelo más preciso antes de enviarlos al LLM. |
| **Contexto / ventana de contexto** | Texto que el LLM puede leer en una petición. |
| **Alucinación** | Respuesta plausible pero falsa generada por el modelo. |
| **Grounding / fundamentación** | Que la respuesta se apoye en fuentes concretas. |
| **Fine-tuning** | Reentrenar un modelo con datos propios para cambiar su comportamiento. |
| **Prompt caching** | Reutilizar la parte fija de un prompt entre peticiones para abaratarlas y acelerarlas. |
| **Streaming** | Recibir la respuesta del modelo a medida que se genera. |
| **SSE** | *Server-Sent Events*: forma simple de enviar eventos del servidor al navegador por HTTP. |

## Recursos

### Para entender
- Lewis et al. (2020), *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*,
  el artículo original: <https://arxiv.org/abs/2005.11401>
- Gao et al. (2023), *Retrieval-Augmented Generation for Large Language Models: A Survey*:
  <https://arxiv.org/abs/2312.10997>
- Anthropic, *Introducing Contextual Retrieval* (contexto en cada fragmento, búsqueda híbrida y re-ranking):
  <https://www.anthropic.com/news/contextual-retrieval>

### Documentación de Claude
- Embeddings (y por qué Anthropic recomienda Voyage AI):
  <https://platform.claude.com/docs/en/build-with-claude/embeddings>
- Citations (citas automáticas de documentos):
  <https://platform.claude.com/docs/en/build-with-claude/citations>
- SDK de TypeScript: <https://github.com/anthropics/anthropic-sdk-typescript>

### Herramientas
- pgvector (vectores en PostgreSQL): <https://github.com/pgvector/pgvector>
- Qdrant: <https://qdrant.tech/documentation/>
- Chroma: <https://www.trychroma.com/>
- Ragas (evaluación de RAG): <https://docs.ragas.io/>
- Ranking de modelos de embeddings (MTEB): <https://huggingface.co/spaces/mteb/leaderboard>
- TF-IDF en Wikipedia: <https://es.wikipedia.org/wiki/Tf-idf>

---

← [8. Ejercicios](08-ejercicios.md) · [Volver al índice](README.md)
