import { NextResponse } from "next/server";
import { kakaoConfig } from "@/lib/kakao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { clientId, redirectUri } = kakaoConfig();

  const authUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);

  // ✅ “나에게 보내기” 권한
  authUrl.searchParams.set("scope", "talk_message");

  // refresh_token이 안 내려오면 아래 주석 해제하고 다시 로그인
  // authUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}
