import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ error: "no code" }, { status: 400 });

  const clientId = process.env.KAKAO_REST_API_KEY!;
  const redirectUri = process.env.KAKAO_REDIRECT_URI!;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET; // 켠 경우에만

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", clientId);
  body.set("redirect_uri", redirectUri);
  body.set("code", code);
  if (clientSecret) body.set("client_secret", clientSecret);

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });
  const json = await res.json();
  return NextResponse.json(json); // 여기서 refresh_token 복사
}
