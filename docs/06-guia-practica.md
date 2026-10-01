# 6. Guía práctica: arma tu propio RAG

Este capítulo es una receta para pasar de "entiendo RAG" a "tengo un asistente que
responde sobre **mis** documentos". Usa este repositorio como punto de partida.

## Paso 0: ¿RAG es la herramienta correcta?

Responde estas preguntas antes de escribir código:

| Pregunta | Si la respuesta es... | Entonces |
| --- | --- | --- |
| ¿El modelo necesita datos que no conoce (internos, recientes)? | No | Probablemente no necesitas RAG: usa un buen prompt. |
| ¿Cuánto texto es? | Menos de ~50 páginas | Prueba primero a pegarlo todo en el prompt con *prompt caching*. |
| ¿Cambia seguido? | Sí | RAG es ideal: reindexar es barato. |
| ¿Hay que citar fuentes o controlar quién ve qué? | Sí | RAG. |
| ¿Las preguntas son de cálculo o agregación ("¿cuántos...?", "promedio de...")? | Sí | Mejor una herramienta (SQL, código) que RAG. |

## Paso 1: define el caso de uso con 20 preguntas reales

El error más común es empezar por la tecnología. Empieza por las preguntas:

1. Escribe **20 preguntas reales** que tus usuarios harían. Pídeselas a ellos si puedes.
2. Para cada una, anota **la respuesta correcta** y **en qué documento** está.
3. Incluye 3 o 4 preguntas **sin respuesta** en tus documentos: el sistema debe decir
   "no lo sé".

Esta lista es tu **conjunto de evaluación**. Todo lo que hagas después se mide contra ella.

## Paso 2: prepara los documentos

1. Junta las fuentes y conviértelas a texto: Markdown es el formato ideal (conserva
   títulos y listas). Para PDFs y Word, herramientas como `pandoc`, `markitdown` o
   `pdftotext` sirven para empezar.
2. **Limpia:** quita índices, encabezados y pies de página repetidos, avisos legales en
   cada página, menús de navegación.
3. **Estructura:** usa títulos (`#`, `##`) que digan de qué trata cada sección. El
   fragmentador de este proyecto los aprovecha.
4. **Un tema por sección.** Si una sección mezcla envíos y garantías, divídela.
5. Copia los archivos en `data/` (borra los de Bicicletas Aurora).

> 💡 Un documento bien escrito mejora más el RAG que cualquier técnica avanzada.

## Paso 3: adapta el prompt

Edita `RAG_SYSTEM_PROMPT` en [`core/src/prompt.ts`](../core/src/prompt.ts). Una plantilla
que funciona bien:

```text
Eres el asistente de <ORGANIZACIÓN> para <QUIÉN LO USA>.
Responde en español, de forma <TONO: breve / detallada / paso a paso>.

Usa únicamente la información de los fragmentos de <contexto>. Cita cada dato con el
número del fragmento, por ejemplo [2].
Si el contexto no contiene la respuesta, dilo con claridad y sugiere <A QUIÉN
CONTACTAR / DÓNDE BUSCAR>. No inventes datos.
<REGLAS DEL DOMINIO: p. ej. "No des asesoramiento legal", "Los precios están en USD">
```

## Paso 4: prueba la recuperación antes que la generación

Primero asegúrate de que el buscador encuentra lo correcto. La pestaña **Paso a paso** de
la web muestra el puntaje de cada fragmento para cualquier pregunta, sin clave de API.
También puedes usar la terminal:

```bash
npm run query -w server -- "tu pregunta"
```

Para cada pregunta de tu lista, ¿el fragmento correcto aparece entre los primeros 4? Si
falla en más de 2 o 3 de cada 20, revisa el [capítulo 7](07-sacarle-el-jugo.md) antes de
seguir. **Si la recuperación falla, ningún modelo puede arreglarlo.**

Convierte tu lista en tests automáticos, como en
[`core/test/rag.test.ts`](../core/test/rag.test.ts):

```ts
const cases: [string, string][] = [
  ["¿Cuántos días de vacaciones tengo el primer año?", "politica-vacaciones.md"],
  // ...tus 20 preguntas
];
```

## Paso 5: agrega la generación y evalúa las respuestas

Con la recuperación funcionando, configura la clave de API y revisa las respuestas con tres
criterios:

| Criterio | Pregunta | Si falla |
| --- | --- | --- |
| **Correcta** | ¿Responde lo que se preguntó, con el dato correcto? | Revisa recuperación y top-k. |
| **Fiel** | ¿Todo lo que dice está en los fragmentos? | Refuerza "usa únicamente" en el prompt. |
| **Citada** | ¿Cada dato tiene su [n] y apunta al fragmento correcto? | Pide citas explícitamente o usa la API de citations. |

## Paso 6: publícalo

| Opción | Cómo | Ideal para |
| --- | --- | --- |
| **GitHub Pages** (estática) | Haz un fork, activa *Settings → Pages → Source: GitHub Actions* y haz push. | Demos y clases. Cada visitante usa su propia clave. |
| **Servidor Node** | `npm run build && npm start` en cualquier hosting de Node (Render, Railway, Fly.io, una VM). Configura `ANTHROPIC_API_KEY` como variable de entorno. | Uso real: la clave queda en el servidor. |

> ⚠️ Nunca publiques una versión estática con **tu** clave dentro: cualquiera podría
> copiarla desde el navegador.

## Paso 7: itera con datos

Después del lanzamiento:

- **Registra** las preguntas que llegan y las que el sistema no pudo responder. Son tu
  mejor fuente de mejoras: o falta un documento, o falla la búsqueda.
- **Agrega** a tu conjunto de evaluación cada fallo real que encuentres.
- **Cambia una cosa a la vez** y vuelve a medir.

## Checklist

- [ ] Tengo 20 preguntas con su respuesta y documento esperados.
- [ ] Mis documentos están limpios, en Markdown y con títulos claros.
- [ ] El prompt describe mi caso, pide citas y permite decir "no lo sé".
- [ ] La recuperación acierta en al menos 17 de 20 preguntas.
- [ ] Las respuestas son correctas, fieles y citadas.
- [ ] La clave de API no está expuesta en el navegador (salvo demos con clave propia).
- [ ] Registro las preguntas para seguir mejorando.

---

← [5. Buenas prácticas](05-buenas-practicas-y-limitaciones.md) · Siguiente: [7. Sácale el jugo a RAG →](07-sacarle-el-jugo.md)
