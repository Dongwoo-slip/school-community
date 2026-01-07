import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, saveRefreshTokenToDb, getRefreshTokenFromDb, sendMemoText } from "@/lib/kakao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) return NextResponse.json({ ok: false, error }, { status: 400 });
  if (!code) return NextResponse.json({ ok: false, error: "missing code" }, { status: 400 });

  try {
    const token = await exchangeCodeForToken(code);

    if (token.refresh_token) {
      await saveRefreshTokenToDb(token.refresh_token);
    }

    const saved = await getRefreshTokenFromDb();
    if (!saved) {
      return new NextResponse(
        `<html><body style="font-family:system-ui;padding:24px">
          <h2>❌ refresh_token 저장 실패</h2>
          <p>토큰 응답에 refresh_token이 없거나 DB 저장이 실패했습니다.</p>
          <p>/api/kakao/login에서 prompt=consent 옵션을 켜고 다시 시도해보세요.</p>
        </body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    await sendMemoText("✅ Square 카카오 연결 완료!\n이제 3시간마다 요약 알림이 옵니다.");

    return new NextResponse(
      `<html><body style="font-family:system-ui;padding:24px">
        <h2>✅ 카카오 연결 완료</h2>
        <p>refresh_token이 Supabase(DB)에 저장되었습니다.</p>
        <p>테스트 메시지를 발송했습니다.</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
