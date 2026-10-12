export async function request<T = unknown>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 12000,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const upstream = options.signal;
  if (upstream?.aborted) controller.abort();
  upstream?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? 'Provider rate limit reached. Please wait before retrying.'
          : 'Data request failed (' + response.status + ').',
      );
    return (await response.json()) as T;
  } catch (error) {
    if (upstream?.aborted)
      throw new DOMException('Request cancelled', 'AbortError');
    if (controller.signal.aborted)
      throw new Error('The data request timed out. Please try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
    upstream?.removeEventListener('abort', abort);
  }
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Unable to load data. Please try again.';
}
