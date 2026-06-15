function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
}

export function toSnake<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(toSnake) as unknown as T;
  if (obj && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        toSnakeCase(k),
        toSnake(v),
      ])
    ) as T;
  }
  return obj;
}
