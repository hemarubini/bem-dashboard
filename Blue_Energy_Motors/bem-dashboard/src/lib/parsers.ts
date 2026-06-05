export function parseNum(value: string | undefined | null): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseBool(value: string | undefined | null): boolean {
  if (!value) return false;
  return value === "true" || value === "True";
}

export function parseJsonArray(value: string | undefined | null): string[] {
  if (!value || value === "[]") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function formatTs(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function isOnline(timestamp: string | undefined): boolean {
  if (!timestamp) return false;
  const t = new Date(timestamp).getTime();
  return Date.now() - t <= 2 * 60 * 1000;
}
