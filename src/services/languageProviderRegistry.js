function qualityRecord(provider, language) {
  const record = provider.qualityEvaluations?.[language];
  if (!record || typeof record !== 'object') return null;
  if (typeof record.benchmarkId !== 'string' || !record.benchmarkId.trim()) return null;
  if (typeof record.metric !== 'string' || !record.metric.trim()) return null;
  if (!Number.isFinite(record.score) || record.score < 0 || record.score > 1) return null;
  if (!Number.isInteger(record.sampleCount) || record.sampleCount < 1) return null;
  if (!Number.isFinite(Date.parse(record.evaluatedAt))) return null;
  return record;
}

function supportsLanguage(provider, language) {
  return Array.isArray(provider.supportedLanguages)
    && provider.supportedLanguages.map((code) => String(code).toLowerCase()).includes(language);
}

export function createLanguageProviderRegistry(providers = []) {
  return Object.freeze({
    evaluateLanguage(language) {
      const code = String(language).toLowerCase();
      return providers.map((provider) => {
        const coverage = Array.isArray(provider.supportedLanguages)
          ? supportsLanguage(provider, code) ? 'supported' : 'unsupported'
          : 'unknown';
        const quality = qualityRecord(provider, code);
        return {
          id: provider.id ?? 'unnamed-provider',
          coverage,
          qualityStatus: quality ? 'evaluated' : 'unverified',
          quality: quality ? { ...quality } : null,
        };
      });
    },
    selectForLanguage(language, benchmarkId, metric) {
      if (typeof benchmarkId !== 'string' || !benchmarkId.trim() || typeof metric !== 'string' || !metric.trim()) return null;
      const code = String(language).toLowerCase();
      const candidates = providers.flatMap((provider) => {
        if (!supportsLanguage(provider, code)) return [];
        const quality = qualityRecord(provider, code);
        if (!quality || quality.benchmarkId !== benchmarkId || quality.metric !== metric) return [];
        return [{ provider, quality }];
      });
      candidates.sort((left, right) => right.quality.score - left.quality.score);
      return candidates[0]?.provider ?? null;
    },
  });
}