"use client";

import { FormEvent, useMemo, useState } from "react";

type ShortenResponse = {
  code: string;
  originalUrl: string;
  shortUrl: string;
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [shortData, setShortData] = useState<ShortenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const shortCodeLength = useMemo(
    () => shortData?.code.length ?? 0,
    [shortData?.code.length],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCopied(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = (await response.json()) as
        | ShortenResponse
        | { error?: string };

      if (!response.ok || !("shortUrl" in data)) {
        setShortData(null);
        setError(
          "error" in data && data.error
            ? data.error
            : "Unable to shorten URL right now.",
        );
        return;
      }

      setShortData(data);
      setUrl("");
    } catch {
      setShortData(null);
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!shortData) {
      return;
    }

    await navigator.clipboard.writeText(shortData.shortUrl);
    setCopied(true);
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,168,97,0.35),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(77,208,225,0.35),transparent_40%),radial-gradient(circle_at_50%_85%,rgba(255,97,128,0.32),transparent_45%)]" />
      <div className="pointer-events-none absolute -top-16 right-[-120px] h-64 w-64 rounded-full border border-white/25 bg-white/10 blur-2xl" />

      <section className="relative w-full max-w-3xl rounded-3xl border border-white/40 bg-white/75 p-6 shadow-[0_30px_60px_rgba(14,24,43,0.25)] backdrop-blur-sm sm:p-10">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-slate-700">
          SURL
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
          Paste once,
          <br />
          get the shortest URL.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-700 sm:text-base">
          We generate compact Base62 keys, so links start as 1 character and
          grow only when needed.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
          <label
            htmlFor="url"
            className="font-mono text-xs uppercase text-slate-600"
          >
            Long URL
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              id="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/super/long/link"
              className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-800 focus:ring-2 focus:ring-slate-200"
              autoComplete="off"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Generating..." : "Make it short"}
            </button>
          </div>
        </form>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {shortData ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Your Short URL
            </p>
            <a
              href={shortData.shortUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block break-all text-xl font-bold text-slate-900 underline decoration-slate-300 underline-offset-4"
            >
              {shortData.shortUrl}
            </a>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100"
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <span className="font-mono text-xs text-slate-600">
                code length: {shortCodeLength}
              </span>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
