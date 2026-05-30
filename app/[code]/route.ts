import { getOriginalUrl } from "@/lib/short-url-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const originalUrl = getOriginalUrl(code);

  if (!originalUrl) {
    return new Response("Short URL not found.", { status: 404 });
  }

  return Response.redirect(originalUrl, 307);
}
