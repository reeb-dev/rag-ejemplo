# 7. Sácale el jugo a RAG

Un RAG básico funciona sorprendentemente bien, pero hay mucho margen. Este capítulo reúne
las técnicas que más mejoran la calidad, ordenadas para que sepas **por dónde empezar**.

## Mapa de mejoras

| Técnica | Mejora | Esfuerzo | Empieza aquí si... |
| --- | --- | --- | --- |
| [Mejores documentos y fragmentos](#1-mejores-documentos-y-fragmentos) | Alta | Bajo | Siempre. Es lo primero. |
| [Un buen prompt](#2-prompts-que-funcionan) | Alta | Bajo | Las respuestas inventan o no citan. |
| [Embeddings reales](#3-embeddings-reales) | Alta | Bajo | No encuentra sinónimos o paráfrasis. |
| [Búsqueda híbrida](#4-búsqueda-híbrida) | Media-alta | Medio | Falla con nombres, códigos o números exactos. |
| [Contexto en cada fragmento](#5-contexto-en-cada-fragmento-contextual-retrieval) | Alta | Medio | Los fragmentos sueltos son ambiguos ("su precio es..."). |
| [Re-ranking](#6-re-ranking) | Media-alta | Medio | El fragmento correcto aparece, pero en el puesto 8. |
| [Reescribir la pregunta](#7-reescribir-la-pregunta) | Media | Bajo | Es un chat con preguntas de seguimiento. |
| [Filtros por metadatos](#8-filtros-por-metadatos) | Media | Bajo | Hay versiones, países, productos o permisos distintos. |
| [Del fragmento al contexto completo](#9-del-fragmento-al-contexto-completo) | Media | Medio | La respuesta necesita más contexto del que trae un fragmento. |
| [RAG agéntico](#10-rag-agéntico-la-búsqueda-como-herramienta) | Alta en preguntas complejas | Medio | Preguntas que requieren varias búsquedas. |

> **Regla de oro:** mide antes y después de cada cambio con tu conjunto de preguntas
> (ver [capítulo 6](06-guia-practica.md#paso-1-define-el-caso-de-uso-con-20-preguntas-reales)).
> Lo que no se mide no se puede mejorar, y algunas técnicas empeoran ciertos casos.

---

## 1. Mejores documentos y fragmentos

- **Fragmentos de un solo tema**, de 200 a 500 palabras. Demasiado chicos pierden contexto;
  demasiado grandes diluyen la similitud.
- **Corta por la estructura** (títulos, párrafos) y no cada N caracteres.
- **Tablas:** conviértelas en frases ("El service completo cuesta 70 USD") o guarda cada
  fila con los encabezados; una tabla cortada por la mitad no se entiende.
- **Preguntas frecuentes:** cada pregunta con su respuesta debe ser un fragmento.
- **Elimina duplicados:** si el mismo párrafo aparece en 10 documentos, ocupará los 10
  primeros puestos y desplazará información útil.

*Pruébalo en este repo:* cambia `DEFAULT_CHUNK_OPTIONS` en
[`core/src/chunker.ts`](../core/src/chunker.ts) y mira el resultado en `GET /api/chunks`.

## 2. Prompts que funcionan

- **Pon el contexto antes de la pregunta** y delimítalo con etiquetas (`<contexto>`,
  `<fragmento>`). Claude sigue muy bien la estructura XML.
- **Numera los fragmentos y pide citas** `[n]`. Mejora la fidelidad y permite verificar.
- **Da permiso explícito para decir "no lo sé"** y di qué hacer en ese caso ("sugiere
  escribir a soporte@...").
- **Pide el formato que necesitas:** "responde en 3 viñetas", "primero la respuesta
  corta, después el detalle".
- **Citas nativas:** la API de Claude puede recibir los fragmentos como documentos con
  `citations: { enabled: true }` y devuelve qué texto exacto respalda cada frase, sin
  depender de que el modelo escriba bien los `[n]`.

## 3. Embeddings reales

TF-IDF (lo que usa este ejemplo) compara palabras. Un modelo de embeddings compara
significados: entiende que "me reintegran la plata" ≈ "reembolso". Es el cambio con mejor
relación beneficio/esfuerzo cuando el corpus crece.

- Elige un modelo **multilingüe** si tus documentos están en español.
- Usa el **mismo modelo** para documentos y preguntas. Algunos (como Voyage) distinguen
  `input_type: "document"` y `"query"`; úsalo.
- Calcula los embeddings **una vez** y guárdalos; solo recalcula lo que cambia.

Ver cómo hacerlo en el [capítulo 4](04-arquitectura-del-ejemplo.md#cambiar-a-embeddings-reales).

## 4. Búsqueda híbrida

Los embeddings fallan con lo **exacto**: códigos de producto ("P20"), nombres propios,
números de artículo. La búsqueda por palabras clave (BM25, TF-IDF) acierta justo ahí.
Combinar ambas suele ser mejor que cualquiera por separado.

La forma más simple de combinarlas es **Reciprocal Rank Fusion (RRF)**: cada fragmento
suma puntos según su posición en cada lista.

```ts
function rrf(lists: string[][], k = 60): string[] {
  const score = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, rank) => score.set(id, (score.get(id) ?? 0) + 1 / (k + rank + 1)));
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

// const ids = rrf([idsPorEmbeddings, idsPorPalabrasClave]);
```

## 5. Contexto en cada fragmento (*Contextual Retrieval*)

Un fragmento suelto puede ser ambiguo: "El precio es de 740 USD" — ¿de qué producto?
Anthropic propuso una técnica llamada *Contextual Retrieval*: antes de indexar, un LLM
escribe 1 o 2 frases que sitúan cada fragmento dentro de su documento, y esas frases se
indexan junto con el fragmento.

```text
<documento>
{{DOCUMENTO COMPLETO}}
</documento>
Este es el fragmento que queremos situar dentro del documento:
<fragmento>
{{FRAGMENTO}}
</fragmento>
Escribe un contexto breve que sitúe este fragmento dentro del documento para mejorar su
recuperación en búsquedas. Responde solo con el contexto.
```

En sus pruebas, Anthropic informó que esto reduce mucho los fallos de recuperación,
sobre todo combinado con búsqueda híbrida y re-ranking. Con *prompt caching* el documento
completo se envía una vez y el costo baja mucho. Este proyecto ya aplica una versión
simple: indexa el título del documento y de la sección junto a cada fragmento.

## 6. Re-ranking

La búsqueda vectorial es rápida pero aproximada. El re-ranking hace dos pasadas:

1. Trae muchos candidatos (por ejemplo, 20 a 50) con la búsqueda rápida.
2. Un modelo de re-ranking (Voyage, Cohere y otros ofrecen uno) puntúa cada par
   *pregunta–fragmento* con más precisión y te quedas con los 3 a 5 mejores.

También puedes usar un LLM como re-ranker pidiéndole que ordene los candidatos por
relevancia; es más lento, pero no requiere otro proveedor.

## 7. Reescribir la pregunta

Lo que el usuario escribe no siempre es lo mejor para buscar.

- **Preguntas de seguimiento:** en un chat, "¿y cuánto pesa?" no sirve para buscar. Pide
  al LLM que la reescriba con el historial: "¿Cuánto pesa la Aurora Plegable P20?".
- **Varias consultas:** genera 3 versiones de la pregunta, busca con cada una y combina
  los resultados con RRF.
- **Descomponer:** "¿qué garantía tiene la E1 y cuánto cuesta el envío?" son dos búsquedas.
- **HyDE:** pide al LLM una respuesta hipotética y busca con ella; a veces se parece más a
  los documentos que la pregunta original.

## 8. Filtros por metadatos

Guarda metadatos con cada fragmento (documento, fecha, versión, país, producto, nivel de
acceso) y **filtra antes de buscar por similitud**:

- Solo la versión vigente de una política.
- Solo los documentos que el usuario tiene permiso para ver. **El control de acceso va
  siempre en la búsqueda, nunca en el prompt.**
- Solo el producto o el país del que se habla.

## 9. Del fragmento al contexto completo

Busca con fragmentos chicos (más precisos) pero envía al modelo más contexto:

- **Ventana:** agrega el fragmento anterior y el siguiente al encontrado.
- **Padre–hijo:** indexa párrafos, pero envía la sección completa a la que pertenecen.
- **Documento completo:** si los documentos son cortos y el modelo tiene una ventana de
  contexto grande, usa RAG para elegir *qué documentos* enviar y mándalos enteros.

## 10. RAG agéntico: la búsqueda como herramienta

En lugar de buscar una vez antes de preguntar, dale al modelo una **herramienta** de
búsqueda (*tool use*) y deja que decida qué buscar, cuántas veces y cuándo tiene suficiente.
Brilla con preguntas que necesitan varios pasos ("compara la garantía de la E1 con la de la
Cargo") a cambio de más latencia y costo. Un buen camino es empezar con RAG clásico y
pasar a este modelo solo para las preguntas que lo necesiten.

## Costo y velocidad

- **Top-k justo:** empieza con 4 y súbelo solo si falta información.
- **Prompt caching:** si el prompt de sistema o una parte del contexto se repite, cachéalo.
- **Streaming:** el usuario ve la respuesta al instante aunque tarde lo mismo.
- **Esfuerzo y modelo:** para preguntas simples, un nivel de esfuerzo bajo (`effort: "low"`,
  como en este ejemplo) da respuestas más rápidas y baratas; súbelo para preguntas que
  requieren razonar sobre varios fragmentos.
- **Caché de respuestas:** las preguntas frecuentes se repiten; guarda sus respuestas.

---

## Diagnóstico rápido

| Síntoma | Causa probable | Qué probar |
| --- | --- | --- |
| Dice "no tengo esa información" pero el dato existe | La recuperación no lo encontró | Mira los fragmentos recuperados. Embeddings reales, búsqueda híbrida, reescribir la pregunta, subir top-k. |
| Responde con datos de otro producto o versión | Fragmentos ambiguos o mezclados | Contexto en cada fragmento, filtros por metadatos, fragmentos de un solo tema. |
| Inventa datos que no están en los documentos | Prompt débil o contexto vacío | "Usa únicamente el contexto", permiso para decir "no lo sé", umbral mínimo de similitud. |
| La respuesta está incompleta | Faltan fragmentos o están cortados | Subir top-k, fragmentos más grandes, enviar la sección completa. |
| Siempre aparecen los mismos fragmentos | Texto repetido (avisos, menús) | Limpiar los documentos, eliminar duplicados. |
| Falla con códigos, siglas o nombres | Los embeddings no capturan coincidencias exactas | Búsqueda híbrida con palabras clave. |
| Falla en preguntas de seguimiento | Busca con la pregunta literal | Reescribir la pregunta con el historial. |
| Es lento | Mucho contexto o un modelo pesado | Bajar top-k, streaming, caching, menor esfuerzo. |
| Las citas apuntan al fragmento equivocado | El modelo numera mal | Citas nativas de la API, fragmentos más cortos. |

## Para quien **usa** un asistente con RAG

Si vas a enseñar a otras personas a usar un asistente con RAG, estos consejos les ayudan
a obtener mejores respuestas:

1. **Sé específico:** "¿cuánto dura la garantía de la batería de la E1?" funciona mejor
   que "¿garantía?".
2. **Usa las palabras de los documentos:** nombres de productos, procesos o áreas tal como
   aparecen en ellos.
3. **Una pregunta por vez.** Si tienes tres dudas, haz tres preguntas.
4. **Revisa las citas** cuando la respuesta importa: el sistema te dice de dónde sacó
   cada dato.
5. **Si dice "no lo sé", créele:** probablemente la información no está en los documentos.
   Reformula o consulta a una persona.
6. **Reporta los errores:** cada fallo es una pista para mejorar documentos o búsqueda.

---

← [6. Guía práctica](06-guia-practica.md) · Siguiente: [8. Ejercicios →](08-ejercicios.md)
