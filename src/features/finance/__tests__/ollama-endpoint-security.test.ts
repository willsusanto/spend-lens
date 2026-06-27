import { describe, expect, test } from 'vitest';

import { normalizeSafeOllamaEndpoint } from '@/features/finance/ollama-endpoint-security';

describe('ollama endpoint security', () => {
  test('allows local and private Ollama endpoints', () => {
    expect(normalizeSafeOllamaEndpoint('http://localhost:11434/')).toBe(
      'http://localhost:11434',
    );
    expect(normalizeSafeOllamaEndpoint('http://127.0.0.1:11434')).toBe(
      'http://127.0.0.1:11434',
    );
    expect(normalizeSafeOllamaEndpoint('http://192.168.1.20:11434')).toBe(
      'http://192.168.1.20:11434',
    );
    expect(
      normalizeSafeOllamaEndpoint('http://host.docker.internal:11434'),
    ).toBe('http://host.docker.internal:11434');
    expect(normalizeSafeOllamaEndpoint('http://ollama:11434')).toBe(
      'http://ollama:11434',
    );
    expect(normalizeSafeOllamaEndpoint('http://[::1]:11434')).toBe(
      'http://[::1]:11434',
    );
  });

  test('blocks public or credentialed Ollama endpoints', () => {
    expect(() => normalizeSafeOllamaEndpoint('https://example.com')).toThrow(
      /local or private/,
    );
    expect(() => normalizeSafeOllamaEndpoint('ftp://localhost:11434')).toThrow(
      /http or https/,
    );
    expect(() =>
      normalizeSafeOllamaEndpoint('http://user:pass@localhost:11434'),
    ).toThrow(/credentials/);
    expect(() =>
      normalizeSafeOllamaEndpoint('http://localhost:11434?target=/metadata'),
    ).toThrow(/query strings/);
    expect(() => normalizeSafeOllamaEndpoint('http://169.254.169.254')).toThrow(
      /local or private/,
    );
  });
});
