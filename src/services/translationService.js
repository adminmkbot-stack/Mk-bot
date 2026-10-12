export class TranslationProviderNotConfiguredError extends Error {
  constructor() {
    super('No translation provider is configured.');
    this.name = 'TranslationProviderNotConfiguredError';
  }
}

export class TranslationPairNotAdvertisedError extends Error {
  constructor(sourceLocale, targetLocale) {
    super(`The translation provider does not advertise ${sourceLocale} to ${targetLocale}.`);
    this.name = 'TranslationPairNotAdvertisedError';
  }
}

export class TranslationCapabilitiesUnknownError extends Error {
  constructor() {
    super('The translation provider has not declared supported language pairs.');
    this.name = 'TranslationCapabilitiesUnknownError';
  }
}

export function createTranslationService(provider = null) {
  return {
    async translate({ text, sourceLocale, targetLocale, signal }) {
      if (!provider) throw new TranslationProviderNotConfiguredError();
      if (signal?.aborted) throw new DOMException('The request was cancelled.', 'AbortError');
      if (typeof provider.translate !== 'function') throw new TypeError('The translation provider has no translate method.');
      const pair = `${sourceLocale}:${targetLocale}`;
      const pairSupported = typeof provider.supportsPair === 'function'
        ? await provider.supportsPair(sourceLocale, targetLocale)
        : Array.isArray(provider.supportedPairs) ? provider.supportedPairs.includes(pair) : null;
      if (typeof pairSupported !== 'boolean') throw new TranslationCapabilitiesUnknownError();
      if (!pairSupported) throw new TranslationPairNotAdvertisedError(sourceLocale, targetLocale);
      const result = await provider.translate({ text, sourceLocale, targetLocale, signal });
      if (!result || typeof result.text !== 'string') throw new TypeError('The translation provider returned an invalid result.');
      return { originalText: text, translatedText: result.text, sourceLocale, targetLocale };
    },
  };
}