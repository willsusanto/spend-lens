const privateHostnameSuffixes = ['.internal', '.local'] as const;
const dockerHostnames = new Set(['host.docker.internal']);

const isLoopbackOrPrivateIpv4 = (hostname: string) => {
  const parts = hostname.split('.').map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
};

const isSafeOllamaHostname = (hostname: string) => {
  const normalized = hostname.toLocaleLowerCase().replace(/^\[(.*)\]$/, '$1');

  return (
    normalized === 'localhost' ||
    normalized === '::1' ||
    dockerHostnames.has(normalized) ||
    isLoopbackOrPrivateIpv4(normalized) ||
    privateHostnameSuffixes.some((suffix) => normalized.endsWith(suffix)) ||
    !normalized.includes('.')
  );
};

export const normalizeSafeOllamaEndpoint = (endpoint: string) => {
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    throw new Error('Ollama endpoint is not a valid URL.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Ollama endpoint must use http or https.');
  }

  if (url.username || url.password) {
    throw new Error('Ollama endpoint must not include credentials.');
  }

  if (url.search || url.hash) {
    throw new Error(
      'Ollama endpoint must not include query strings or hashes.',
    );
  }

  if (!isSafeOllamaHostname(url.hostname)) {
    throw new Error(
      'Ollama endpoint must be local or private, such as localhost, a LAN IP, or an internal Docker host.',
    );
  }

  return url.toString().replace(/\/+$/, '');
};
