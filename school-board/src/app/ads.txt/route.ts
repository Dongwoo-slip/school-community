import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function publisherId() {
  const explicit = process.env.GOOGLE_ADSENSE_PUBLISHER_ID?.trim();
  if (explicit) return explicit.replace(/^ca-/, "");

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID?.trim();
  if (!clientId) return null;
  return clientId.replace(/^ca-/, "");
}

export function GET() {
  const pubId = publisherId();

  if (!pubId) {
    return new NextResponse("ads.txt is not configured yet.\n", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  return new NextResponse(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
