import type { z } from 'zod';
export function readStored<T>(
  key: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  fallback: T,
): T {
  try {
    const raw = localStorage.getItem('airsafe:' + key);
    if (!raw) return fallback;
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}
export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem('airsafe:' + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
