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

export const DEFAULT_MODEL = "claude-opus-5-5";

export interface ClaudeGeneratorOptions {
  /** Si se omite, el SDK la toma de ANTHROPIC_API_KEY (solo en Node). */
  apiKey?: string;
  model?: string;
  /**
   * Permite llamar a la API directamente desde el navegador (lo usa la demo de
   * GitHub Pages). La clave queda expuesta a quien use ese navegador, así que
   * solo es aceptable cuando cada persona usa SU propia clave.
   */
  browser?: boolean;
}

export class ClaudeGenerator implements Generator {
  private readonly client: Anthropic;
  readonly model: string;

  constructor({ apiKey, model, browser }: ClaudeGeneratorOptions = {}) {
    this.model = model || DEFAULT_MODEL;
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: browser });
  }

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
