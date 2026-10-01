# 3. Beneficios y ventajas de RAG

Este es el capítulo central: **por qué** conviene usar RAG y cuándo es mejor que las
alternativas.

## Los 8 beneficios principales

### 1. Respuestas con datos propios, sin reentrenar el modelo
El modelo responde sobre tus documentos internos, tu catálogo o tus políticas sin que
tengas que entrenarlo. Usas un modelo de propósito general y le das el conocimiento
"en el momento".

*En el ejemplo:* ningún modelo conoce Bicicletas Aurora, pero el asistente responde
precios, garantías y horarios correctamente.

### 2. Menos alucinaciones
Cuando el modelo tiene el dato delante y la instrucción de usar solo ese contexto, la
probabilidad de que invente baja muchísimo. Y si la información no está, puede decirlo.

*Pruébalo:* pregunta "¿Venden monopatines eléctricos?". El catálogo no los menciona, así
que el asistente con RAG debería decir que no tiene esa información en lugar de inventar.

### 3. Información siempre actualizada
Para actualizar lo que "sabe" el sistema basta con **cambiar los documentos y volver a
indexar** (segundos o minutos). No hay que esperar a un modelo nuevo ni pagar un
reentrenamiento.

*Pruébalo:* edita el precio de la Aurora Urbana en `data/02-catalogo.md`, reinicia el
servidor y vuelve a preguntar.

### 4. Respuestas verificables (citas y trazabilidad)
Cada respuesta puede citar de qué fragmento sale. El usuario (o un auditor) puede
comprobarlo con un clic. Esto es clave en ámbitos regulados: legal, salud, finanzas, RR. HH.

*En el ejemplo:* las citas `[1]`, `[2]` de la respuesta enlazan con los fragmentos
mostrados debajo.

### 5. Menor costo que meter todo en el prompt
Enviar solo los 3 o 4 fragmentos relevantes cuesta una fracción de enviar todos los
documentos en cada pregunta. Con miles de documentos, ni siquiera entrarían.

| Enfoque | Texto enviado por pregunta (ejemplo de 5.000 páginas) |
| --- | --- |
| Todo en el prompt | ~2.500.000 palabras (no entra en ningún modelo) |
| RAG con top-k = 4 | ~800 palabras |

### 6. Control de acceso por usuario
Como la búsqueda la hace tu código, puedes filtrar qué documentos puede ver cada persona
(por ejemplo, RR. HH. ve las nóminas, el resto no). Con un modelo reentrenado, ese
conocimiento quedaría "mezclado" en los pesos y sería imposible de separar.

### 7. Independencia del modelo
El conocimiento vive en tu base de documentos, no dentro de un modelo. Puedes cambiar de
modelo (o de versión) sin perder nada: solo cambia el paso de generación.

### 8. Fácil de empezar, fácil de mejorar
Un RAG básico se arma en un día (este repositorio lo demuestra). Luego se mejora por
partes: mejores fragmentos, mejores embeddings, búsqueda híbrida, re-ranking... cada
pieza se puede medir y optimizar por separado.

## RAG frente a las alternativas

| | **RAG** | **Fine-tuning** (reentrenar) | **Todo en el prompt** (contexto largo) | **Modelo solo** |
| --- | --- | --- | --- | --- |
| Usa datos privados | ✅ | ✅ | ✅ | ❌ |
| Actualizar conocimiento | Minutos (reindexar) | Horas o días (reentrenar) | Inmediato | Imposible |
| Costo por consulta | Bajo | Bajo | Alto | Bajo |
| Costo inicial | Bajo | Alto | Nulo | Nulo |
| Cita fuentes | ✅ | ❌ | ✅ | ❌ |
| Escala a millones de documentos | ✅ | Parcial | ❌ | — |
| Control de acceso por usuario | ✅ | ❌ | ✅ | — |
| Riesgo de alucinar datos | Bajo | Medio | Bajo | Alto |
| Bueno para... | Conocimiento factual que cambia | Estilo, formato, tareas muy específicas | Pocos documentos, análisis puntual | Conocimiento general |

### ¿Y el fine-tuning?
El fine-tuning cambia **cómo** se comporta el modelo (tono, formato, una tarea muy
concreta), pero es una mala forma de enseñarle **hechos**: es caro, hay que repetirlo cada
vez que cambian los datos, no cita fuentes y el modelo puede seguir mezclando o inventando
datos. Regla práctica: **RAG para conocimiento, fine-tuning para comportamiento.** A veces
se combinan.

### ¿Y los modelos con contexto enorme?
Modelos como Claude aceptan cientos de miles de tokens (o más) de contexto. Si tienes
**pocos documentos** (unas decenas de páginas), pegarlo todo en el prompt —idealmente con
*prompt caching* para abaratarlo— puede ser más simple que RAG y funcionar igual de bien.
RAG gana cuando la base de conocimiento es grande, cambia seguido, necesitas citas, control
de acceso o un costo por consulta bajo. Ambos enfoques también se combinan: RAG para elegir
los documentos, contexto largo para mandarlos completos.

## Casos de uso típicos

- **Atención al cliente:** responder sobre productos, envíos, garantías (como el ejemplo).
- **Asistente interno:** políticas de la empresa, onboarding, manuales de procesos.
- **Soporte técnico:** buscar en documentación, tickets resueltos y bases de conocimiento.
- **Legal y cumplimiento:** encontrar cláusulas en contratos y normativas, con cita exacta.
- **Salud e investigación:** consultar guías clínicas o papers con trazabilidad.
- **Desarrollo de software:** responder preguntas sobre un repositorio de código grande.
- **Educación:** un tutor que responde usando el material del curso.

## Cuándo **no** usar RAG

- La pregunta es de conocimiento general que el modelo ya sabe bien.
- Tienes pocos documentos que caben cómodos en el prompt (usa contexto largo + caché).
- Necesitas cambiar el estilo o formato del modelo, no darle datos (considera fine-tuning
  o, primero, mejores instrucciones).
- La respuesta requiere cálculos sobre datos tabulares: ahí conviene que el modelo use una
  herramienta (consultar SQL, ejecutar código) en lugar de leer fragmentos de texto.

---

← [2. Cómo funciona](02-como-funciona.md) · Siguiente: [4. Arquitectura del ejemplo →](04-arquitectura-del-ejemplo.md)
