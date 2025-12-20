import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.KAKAO_REST_API_KEY;
  const redirectUri = process.env.KAKAO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Missing env", clientId: !!clientId, redirectUri: !!redirectUri },
      { status: 500 }
    );
  }

  const url =
    `https://kauth.kakao.com/oauth/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=talk_message`;

  return NextResponse.redirect(url);
}
