export class AIProviderNotConfiguredError extends Error {
  constructor() {
    super('No AI provider is configured.');
    this.name = 'AIProviderNotConfiguredError';
  }
}

export class AIProviderLanguageCapabilitiesUnknownError extends Error {
  constructor() {
    super('The AI provider has not declared its supported languages.');
    this.name = 'AIProviderLanguageCapabilitiesUnknownError';
  }
}

export class AIProviderLanguageNotSupportedError extends Error {
  constructor(language) {
    super(`The AI provider does not advertise support for ${language}.`);
    this.name = 'AIProviderLanguageNotSupportedError';
  }
}

export function createChatService(provider = null) {
  return {
    get supportedLanguages() {
      return provider && Array.isArray(provider.supportedLanguages) ? [...provider.supportedLanguages] : [];
    },
    async sendMessage({ messages, responseLanguage, signal }) {
      if (!provider) throw new AIProviderNotConfiguredError();
      if (signal?.aborted) throw new DOMException('The request was cancelled.', 'AbortError');
      if (!Array.isArray(provider.supportedLanguages)) throw new AIProviderLanguageCapabilitiesUnknownError();
      const supportedLanguages = provider.supportedLanguages.map((language) => String(language).toLowerCase());
      if (!supportedLanguages.includes(String(responseLanguage ?? '').toLowerCase())) {
        throw new AIProviderLanguageNotSupportedError(responseLanguage ?? 'unknown');
      }
      return provider.generateReply({ messages, responseLanguage, signal });
    },
  };
}