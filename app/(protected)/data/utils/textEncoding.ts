// app/(protected)/data/utils/textEncoding.ts

const MOJIBAKE_MARKERS = /[\u00C3\u00C2\u00E2]/;
const CP1252_EXTENDED_REVERSE: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

function markerCount(input: string): number {
  const matches = input.match(/[\u00C3\u00C2\u00E2]/g);
  return matches ? matches.length : 0;
}

function replacementCount(input: string): number {
  const matches = input.match(/\uFFFD/g);
  return matches ? matches.length : 0;
}

function cp1252CharToByte(ch: string): number {
  const codePoint = ch.codePointAt(0);
  if (!codePoint) {
    return 0x3f;
  }
  if (codePoint <= 0xff) {
    return codePoint;
  }
  return CP1252_EXTENDED_REVERSE[codePoint] ?? 0x3f;
}

function decodeUtf8FromLatin1(input: string): string {
  const bytes = Uint8Array.from(Array.from(input), cp1252CharToByte);
  return new TextDecoder("utf-8").decode(bytes);
}

function improvesReadability(before: string, after: string): boolean {
  const beforeMarkers = markerCount(before);
  const afterMarkers = markerCount(after);
  const beforeReplacement = replacementCount(before);
  const afterReplacement = replacementCount(after);
  return afterMarkers < beforeMarkers && afterReplacement <= beforeReplacement;
}

/**
 * Fix common UTF-8/Latin-1 mojibake (for example "Ma\u00c3\u00afs" => "Ma\u00efs").
 * Applies up to 2 decoding passes only when readability improves.
 */
export function decodeLikelyMojibake(input: string): string {
  if (!input || !MOJIBAKE_MARKERS.test(input)) {
    return input;
  }

  try {
    let current = input;

    for (let i = 0; i < 2; i += 1) {
      if (!MOJIBAKE_MARKERS.test(current)) {
        break;
      }
      const decoded = decodeUtf8FromLatin1(current);
      if (!decoded || !improvesReadability(current, decoded)) {
        break;
      }
      current = decoded;
    }

    return current;
  } catch {
    return input;
  }
}

/**
 * Deeply normalize strings in API payloads.
 */
export function normalizeMojibakeDeep<T>(value: T): T {
  if (typeof value === "string") {
    return decodeLikelyMojibake(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeMojibakeDeep(item)) as T;
  }

  if (!value || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = normalizeMojibakeDeep(entry);
  }

  return out as T;
}
