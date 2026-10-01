import Anthropic from "@anthropic-ai/sdk";

/**
 * Paso "G" de RAG (Generation): un modelo de lenguaje redacta la respuesta.
 *
 * Se usa streaming para que el texto aparezca en pantalla a medida que se genera.
 */
export interface GenerateParams {
  system: string;
  userMessage: string;
}

export interface Generator {
  readonly model: string;
  generate(params: GenerateParams): AsyncGenerator<string>;
}

// Modelos que aceptan el modo de respaldo del servidor `fallbacks: "default"`.
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

export class ClaudeGenerator implements Generator {
  private readonly client = new Anthropic();

  constructor(readonly model: string = process.env.CLAUDE_MODEL || "claude-opus-5-5") {}

  async *generate({ system, userMessage }: GenerateParams): AsyncGenerator<string> {
    const useFallback = FALLBACK_MODELS.has(this.model);
    const stream = this.client.beta.messages.stream({
      model: this.model,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: userMessage }],
      // Preguntas y respuestas cortas: esfuerzo bajo = respuestas rápidas y baratas.
      output_config: { effort: "low" },
      // Si el modelo declina la petición, el servidor la reintenta con otro modelo.
      ...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }

    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      yield "\n\n_(El modelo no pudo responder a esta pregunta.)_";
    } else if (final.stop_reason === "max_tokens") {
      yield "\n\n_(Respuesta cortada por longitud.)_";
    }
  }
}

/** ¿Hay credenciales para llamar a Claude? Sin ellas la app funciona en modo solo recuperación. */
export function hasClaudeCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
