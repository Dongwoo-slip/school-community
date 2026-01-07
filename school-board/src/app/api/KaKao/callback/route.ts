import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  saveRefreshTokenToDb,
  getRefreshTokenFromDb,
  sendMemoTemplate,
  kakaoConfig,
} from "@/lib/kakao";

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
      return NextResponse.json(
        { ok: false, error: "refresh_token not saved (try login again)" },
        { status: 500 }
      );
    }

    // ✅ 연결 확인 카드 메시지(예쁘게)
    const siteUrl = kakaoConfig().siteUrl;
    const logoUrl = `${siteUrl}/logo.png`;

    const templateObject = {
      object_type: "feed",
      content: {
        title: "✅ Square 카카오 연결 완료",
        description: "이제 매일 00:00에 일일 요약 알림이 전송됩니다.",
        image_url: logoUrl,
        link: { web_url: siteUrl, mobile_web_url: siteUrl },
      },
      item_content: {
        profile_text: "Square",
        profile_image_url: logoUrl,
        items: [
          { item: "상태", item_op: "정상 연결" },
          { item: "알림 주기", item_op: "매일 00:00" },
        ],
      },
      buttons: [
        { title: "사이트 열기", link: { web_url: siteUrl, mobile_web_url: siteUrl } },
      ],
    };

    await sendMemoTemplate(templateObject);

    return new NextResponse(
      `<html><body style="font-family:system-ui;padding:24px">
        <h2>✅ 카카오 연결 완료</h2>
        <p>refresh_token이 DB에 저장되었습니다.</p>
        <p>테스트 메시지를 발송했습니다.</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
rg "sendMemoText"
