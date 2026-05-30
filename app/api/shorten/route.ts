import { createShortUrl } from "@/lib/short-url-store";

type ShortenBody = {
  url?: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: ShortenBody;

  try {
    body = (await request.json()) as ShortenBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = createShortUrl(body.url ?? "");
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  return Response.json(
    {
      code: result.code,
      originalUrl: result.originalUrl,
      shortUrl: `${origin}/${result.code}`,
    },
    { status: 201 }
  );
}