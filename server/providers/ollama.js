import { BaseProvider } from "./base.js";

export class OllamaProvider extends BaseProvider {
  constructor({ baseUrl = "http://localhost:11434" } = {}) {
    super();
    this.baseUrl = baseUrl;
  }

  get name() {
    return "ollama";
  }

  async isAvailable() {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels() {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
    const { models = [] } = await res.json();
    return models.map((m) => ({
      id: m.name,
      name: m.name.split(":")[0],
      size: m.size,
      parameterSize: m.details?.parameter_size,
      family: m.details?.family,
      quantization: m.details?.quantization_level,
      provider: "ollama",
    }));
  }

  async *streamCompletion({ model, messages, temperature = 0.7 }) {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true, options: { temperature } }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama error ${res.status}: ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let chunk;
        try {
          chunk = JSON.parse(trimmed);
        } catch {
          continue;
        }

        if (chunk.done) {
          const totalTokens = chunk.eval_count;
          const tokensPerSecond =
            chunk.eval_count && chunk.eval_duration
              ? (chunk.eval_count / chunk.eval_duration) * 1e9
              : undefined;
          yield { token: "", done: true, totalTokens, tokensPerSecond };
        } else {
          yield { token: chunk.message?.content ?? "", done: false };
        }
      }
    }
  }
}
