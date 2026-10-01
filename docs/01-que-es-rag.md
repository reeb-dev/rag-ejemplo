# 1. ¿Qué es RAG?

**RAG** (*Retrieval-Augmented Generation*, en español **generación aumentada por recuperación**)
es una técnica para que un modelo de lenguaje (LLM) responda usando **información que no
estaba en su entrenamiento**: los documentos de tu empresa, tu base de conocimiento, tus
manuales, tickets o código.

La idea cabe en una frase:

> Antes de preguntarle al modelo, **busca** los fragmentos de tus documentos que tienen
> que ver con la pregunta y **pégalos en el prompt** como contexto.

## El problema que resuelve

Un LLM como Claude sabe muchísimo, pero:

1. **No conoce tus datos privados.** Nunca vio el manual interno de tu empresa ni la
   política de garantías que redactaste el mes pasado.
2. **Su conocimiento tiene fecha de corte.** Lo que pasó después de su entrenamiento no lo sabe.
3. **Cuando no sabe, puede inventar.** Si le preguntas por algo que desconoce, a veces
   responde con algo plausible pero falso (una "alucinación").

RAG ataca los tres problemas a la vez: le da al modelo el texto exacto que necesita en el
momento en que lo necesita, y le pide que responda **solo** con eso.

## Una analogía

Piensa en un examen:

| Situación | Equivalente |
| --- | --- |
| Examen a libro cerrado | LLM sin RAG: responde de memoria, y si no recuerda, improvisa. |
| Examen a libro abierto, pero el libro tiene 10.000 páginas | Pegar todos los documentos en el prompt: caro, lento y el dato importante se pierde entre el resto. |
| Examen a libro abierto con un bibliotecario que te alcanza las 3 páginas justas | **RAG**: un buscador elige los fragmentos relevantes y el modelo responde con ellos delante. |

## Las tres letras

- **R — Retrieval (recuperar):** buscar en tus documentos los fragmentos más relevantes
  para la pregunta.
- **A — Augmented (aumentar):** agregar esos fragmentos al prompt, junto con la pregunta y
  unas instrucciones ("responde solo con esto, cita las fuentes").
- **G — Generation (generar):** el LLM redacta la respuesta en lenguaje natural.

## Un ejemplo concreto (el de este repositorio)

El ejemplo usa una empresa **inventada**, *Bicicletas Aurora*. Si le preguntas a un
modelo sin RAG:

> ¿Cuánto dura la garantía de la batería de la Aurora Eléctrica E1?

no tiene forma de saberlo: la empresa no existe. Lo mejor que puede hacer es decir que no
lo sabe; lo peor, inventar un número. Con RAG, el sistema encuentra este fragmento en
`data/03-garantia.md`:

> **Batería de la Aurora Eléctrica E1**: 2 años o 800 ciclos de carga, lo que ocurra primero.

lo pone en el prompt, y el modelo responde *"2 años o 800 ciclos de carga [1]"*, con una
cita que el usuario puede verificar.

La app tiene una casilla **"Comparar con una respuesta sin RAG"** para ver esta diferencia
en vivo.

## Origen

El término viene del artículo *Retrieval-Augmented Generation for Knowledge-Intensive NLP
Tasks* (Lewis et al., Facebook AI Research, 2020). Hoy es el patrón más usado para construir
asistentes sobre documentación propia, buscadores internos y chatbots de atención al cliente.

---

Siguiente: [2. Cómo funciona paso a paso →](02-como-funciona.md)
