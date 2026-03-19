export class BaseProvider {
  get name() {
    throw new Error('not implemented')
  }

  async listModels() {
    throw new Error('not implemented')
  }

  // eslint-disable-next-line require-yield
  async *streamCompletion({
    model: _model,
    messages: _messages,
    temperature: _temperature,
  }) {
    throw new Error('not implemented')
  }

  async complete({ model, messages, temperature }) {
    let content = ''
    let totalTokens
    let tokensPerSecond
    for await (const chunk of this.streamCompletion({
      model,
      messages,
      temperature,
    })) {
      content += chunk.token ?? ''
      if (chunk.done) {
        totalTokens = chunk.totalTokens
        tokensPerSecond = chunk.tokensPerSecond
      }
    }
    return { content, totalTokens, tokensPerSecond }
  }

  async isAvailable() {
    throw new Error('not implemented')
  }
}
