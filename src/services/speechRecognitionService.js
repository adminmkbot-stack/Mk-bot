export class SpeechRecognitionNotConfiguredError extends Error {
  constructor() {
    super('Speech recognition is not configured.');
    this.name = 'SpeechRecognitionNotConfiguredError';
  }
}

export class SpeechRecognitionCapabilitiesUnknownError extends Error {
  constructor() {
    super('The speech recognition provider has not declared supported languages.');
    this.name = 'SpeechRecognitionCapabilitiesUnknownError';
  }
}

export class SpeechRecognitionLanguageNotSupportedError extends Error {
  constructor(locale) {
    super(`The speech recognition provider does not advertise ${locale}.`);
    this.name = 'SpeechRecognitionLanguageNotSupportedError';
  }
}

export function createSpeechRecognitionService(provider = null) {
  return {
    get supportedLanguages() {
      return provider && Array.isArray(provider.supportedLanguages) ? [...provider.supportedLanguages] : [];
    },
    async recognize(options) {
      if (!provider) throw new SpeechRecognitionNotConfiguredError();
      if (!Array.isArray(provider.supportedLanguages)) throw new SpeechRecognitionCapabilitiesUnknownError();
      if (!provider.supportedLanguages.map((language) => String(language).toLowerCase()).includes(String(options.locale ?? '').toLowerCase())) {
        throw new SpeechRecognitionLanguageNotSupportedError(options.locale ?? 'unknown');
      }
      return provider.recognize(options);
    },
  };
}