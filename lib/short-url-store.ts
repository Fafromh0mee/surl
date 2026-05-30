import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DATABASE_DIRECTORY = path.join(process.cwd(), ".data");
const DATABASE_PATH = path.join(DATABASE_DIRECTORY, "short-urls.sqlite");

fs.mkdirSync(DATABASE_DIRECTORY, { recursive: true });

const database = new Database(DATABASE_PATH);

database.pragma("journal_mode = WAL");
database.exec(`
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_url TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE
  );
`);

const selectByUrl = database.prepare(
  "SELECT id, original_url, code FROM links WHERE original_url = ?"
);
const selectByCode = database.prepare(
  "SELECT original_url FROM links WHERE code = ?"
);
const insertLink = database.prepare(
  "INSERT INTO links (original_url) VALUES (?)"
);
const updateCode = database.prepare(
  "UPDATE links SET code = ? WHERE id = ?"
);

type LinkRow = {
  id: number;
  original_url: string;
  code: string | null;
};

type ShortenResult =
  | {
      ok: true;
      code: string;
      originalUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

function encodeBase62(value: number): string {
  if (value === 0) {
    return ALPHABET[0];
  }

  let encoded = "";
  let current = value;

  while (current > 0) {
    const remainder = current % ALPHABET.length;
    encoded = ALPHABET[remainder] + encoded;
    current = Math.floor(current / ALPHABET.length);
  }

  return encoded;
}

const persistLink = database.transaction((normalizedUrl: string) => {
  const existing = selectByUrl.get(normalizedUrl) as LinkRow | undefined;
  if (existing) {
    const code = existing.code ?? encodeBase62(existing.id - 1);

    if (!existing.code) {
      updateCode.run(code, existing.id);
    }

    return { code, originalUrl: existing.original_url };
  }

  const inserted = insertLink.run(normalizedUrl);
  const id = Number(inserted.lastInsertRowid);
  const code = encodeBase62(id - 1);
  updateCode.run(code, id);

  return { code, originalUrl: normalizedUrl };
});

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+-.]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export function createShortUrl(input: string): ShortenResult {
  const normalized = normalizeUrl(input);
  if (!normalized) {
    return { ok: false, error: "Please provide a valid URL." };
  }

  try {
    const persisted = persistLink(normalized);
    return { ok: true, code: persisted.code, originalUrl: persisted.originalUrl };
  } catch {
    const existing = selectByUrl.get(normalized) as LinkRow | undefined;
    if (existing) {
      const code = existing.code ?? encodeBase62(existing.id - 1);

      if (!existing.code) {
        updateCode.run(code, existing.id);
      }

      return { ok: true, code, originalUrl: existing.original_url };
    }

    return { ok: false, error: "Unable to save URL. Please try again." };
  }
}

export function getOriginalUrl(code: string): string | null {
  const row = selectByCode.get(code) as { original_url: string } | undefined;

  return row?.original_url ?? null;
}