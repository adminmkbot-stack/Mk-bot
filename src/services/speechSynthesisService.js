export class SpeechSynthesisNotConfiguredError extends Error {
  constructor() {
    super('Speech synthesis is not configured.');
    this.name = 'SpeechSynthesisNotConfiguredError';
  }
}

export class SpeechSynthesisCapabilitiesUnknownError extends Error {
  constructor() {
    super('The speech synthesis provider has not declared supported languages.');
    this.name = 'SpeechSynthesisCapabilitiesUnknownError';
  }
}

export class SpeechSynthesisLanguageNotSupportedError extends Error {
  constructor(locale) {
    super(`The speech synthesis provider does not advertise ${locale}.`);
    this.name = 'SpeechSynthesisLanguageNotSupportedError';
  }
}

export function createSpeechSynthesisService(provider = null) {
  return {
    get supportedLanguages() {
      return provider && Array.isArray(provider.supportedLanguages) ? [...provider.supportedLanguages] : [];
    },
    async speak(options) {
      if (!provider) throw new SpeechSynthesisNotConfiguredError();
      if (!Array.isArray(provider.supportedLanguages)) throw new SpeechSynthesisCapabilitiesUnknownError();
      if (!provider.supportedLanguages.map((language) => String(language).toLowerCase()).includes(String(options.locale ?? '').toLowerCase())) {
        throw new SpeechSynthesisLanguageNotSupportedError(options.locale ?? 'unknown');
      }
      return provider.speak(options);
    },
  };
}