# 6. Ejercicios para aprender (o enseñar) RAG

Ejercicios prácticos sobre este repositorio, de menor a mayor dificultad. Sirven para un
taller o una clase.

## Nivel 1: observar

1. **Con y sin RAG.** Activa "Comparar con una respuesta sin RAG" y prueba las preguntas de
   ejemplo. ¿En cuáles inventa el modelo sin RAG? ¿En cuáles admite que no sabe?
2. **Qué ve el modelo.** Mira los fragmentos recuperados para "¿Abren los domingos?".
   ¿Cuál tiene la respuesta? ¿En qué posición aparece?
3. **Top-k.** Pon top-k en 1 y pregunta "¿Cuánto cuesta la Aurora Cargo y es gratis el
   envío?". La respuesta necesita dos documentos distintos. ¿Qué pasa con k = 1? Súbelo a
   4. ¿Por qué cambia la respuesta?
4. **Preguntas sin respuesta.** Pregunta "¿Venden monopatines eléctricos?" o "¿Tienen
   tienda en Córdoba?". ¿El asistente inventa o reconoce que no tiene la información?

## Nivel 2: modificar datos

5. **Actualizar conocimiento.** Cambia el precio de la Aurora Urbana en
   `data/02-catalogo.md` y reinicia el servidor. Comprueba que la respuesta cambia sin
   tocar el modelo. (Beneficio n.º 3.)
6. **Agregar un documento.** Crea `data/06-tiendas.md` con las direcciones de las tiendas
   y haz preguntas sobre ellas.
7. **Usa tus propios documentos.** Reemplaza `data/` por el reglamento de tu facultad, el
   manual de tu empresa o la documentación de un proyecto, y adapta `RAG_SYSTEM_PROMPT` en
   `server/src/rag/prompt.ts`.

## Nivel 3: modificar el código

8. **Tamaño de fragmento.** Cambia `DEFAULT_CHUNK_OPTIONS` en `chunker.ts` a
   `{ maxChars: 200, overlap: 40 }` y a `{ maxChars: 3000, overlap: 0 }`. Mira
   `GET /api/chunks` y compara la calidad de las respuestas.
9. **Sinónimos.** Pregunta "¿me reintegran la plata si no me gusta?". TF-IDF no sabe que
   *reintegrar* ≈ *reembolso* ≈ *devolución*. ¿Qué fragmentos trae? (Pista: mira
   `POST /api/search`.) Esta es la principal razón para usar embeddings reales.
10. **Un test nuevo.** Agrega un caso a `server/test/rag.test.ts` y ejecuta `npm test`.

## Nivel 4: proyectos

11. **Embeddings reales.** Implementa un `Embedder` con Voyage AI u otro proveedor (ver
    [capítulo 4](04-arquitectura-del-ejemplo.md#cambiar-a-embeddings-reales)) y repite el
    ejercicio 9.
12. **Búsqueda híbrida.** Combina las puntuaciones de TF-IDF y de embeddings (por ejemplo,
    con *Reciprocal Rank Fusion*).
13. **Chat con memoria.** Permite preguntas de seguimiento ("¿y cuánto pesa?") reescribiendo
    la pregunta con el historial antes de buscar.
14. **Evaluación.** Escribe 20 preguntas con su documento correcto y calcula el *recall@k*
    del buscador para k = 1, 2, 4.
15. **Citas nativas.** Usa la función de *citations* de la API de Claude, enviando los
    fragmentos como documentos, en lugar de pedir las citas `[n]` en el prompt.

---

← [5. Buenas prácticas](05-buenas-practicas-y-limitaciones.md) · Siguiente: [7. Glosario y recursos →](07-glosario-y-recursos.md)
