import { describe, expect, test } from 'vitest';

import { isSameOriginRequest } from '@/utils/request-security';

const createRequest = (headers: Record<string, string>) =>
  new Request('http://localhost/api/test', { headers });

describe('request security helpers', () => {
  test('allows same-origin and non-browser requests', () => {
    expect(
      isSameOriginRequest(
        createRequest({
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
        }),
      ),
    ).toBe(true);
    expect(isSameOriginRequest(createRequest({ host: 'localhost:3000' }))).toBe(
      true,
    );
  });

  test('blocks cross-origin or malformed origin requests', () => {
    expect(
      isSameOriginRequest(
        createRequest({
          host: 'localhost:3000',
          origin: 'https://evil.example',
        }),
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        createRequest({
          host: 'localhost:3000',
          origin: 'not-a-url',
        }),
      ),
    ).toBe(false);
  });
});
