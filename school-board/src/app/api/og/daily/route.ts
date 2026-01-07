import { NextRequest, NextResponse } from "next/server";
import { sendMemoTemplate, kakaoConfig } from "@/lib/kakao";
import {
  getLastRun,
  setLastRun,
  getNewPostsCount,
  getNewCommentsCount,
  getReportsSummary,
  getTotalPostsCount,
  getTotalCommentsCount,
  getTotalMembersCount,
  getTotalVisitsCount,
  kstToday,
} from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeAuth(h: string) {
  const t = (h || "").trim();
  if (!t) return "";
  const m = t.match(/^bearer\s+(.+)$/i);
  return (m ? m[1] : t).trim();
}

function fmtKo(n: number) {
  return Number(n || 0).toLocaleString("ko-KR");
}

export async function GET(req: NextRequest) {
  const got = normalizeAuth(req.headers.get("authorization") || "");
  const secret = (process.env.CRON_SECRET || "").trim();

  if (!secret || got !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const name = "kakao_daily_summary";

  try {
    const last = await getLastRun(name);
    const now = new Date();

    const [tp, tc, tm, tv] = await Promise.all([
      getTotalPostsCount(),
      getTotalCommentsCount(),
      getTotalMembersCount(),
      getTotalVisitsCount(),
    ]);

    const [np, nc, reports] = await Promise.all([
      getNewPostsCount(last),
      getNewCommentsCount(last),
      getReportsSummary(last),
    ]);

    const { siteUrl } = kakaoConfig();
    const today = kstToday();
    const logoUrl = `${siteUrl}/logo.png`;

    // ✅ 짧은 OG URL (숫자만 + .png 경로)
    const ogUrl =
      `${siteUrl}/api/og/daily.png` +
      `?d=${encodeURIComponent(today)}` +
      `&tp=${tp}&tc=${tc}&tm=${tm}&tv=${tv}` +
      `&np=${np}&nc=${nc}&nr=${reports.newReports}&or=${reports.openReports}` +
      `&v=${Date.now()}`;

    const templateObject = {
      object_type: "feed",
      content: {
        title: `📊 Square 일일 요약 (${today})`,
        description: "카드 이미지에서 전체 요약을 확인하세요.",
        image_url: ogUrl,
        image_width: 800,
        image_height: 800,
        link: { web_url: siteUrl, mobile_web_url: siteUrl },
      },
      item_content: {
        profile_text: "Square",
        profile_image_url: logoUrl,
        // 백업용으로 짧게만
        items: [
          { item: "전체글", item_op: `${fmtKo(tp)}개` },
          { item: "전체댓글", item_op: `${fmtKo(tc)}개` },
          { item: "회원", item_op: `${fmtKo(tm)}명` },
          { item: "누적방문", item_op: `${fmtKo(tv)}회` },
        ],
      },
      buttons: [
        { title: "사이트 열기", link: { web_url: siteUrl, mobile_web_url: siteUrl } },
        {
          title: "자유게시판",
          link: { web_url: `${siteUrl}/community/free`, mobile_web_url: `${siteUrl}/community/free` },
        },
      ],
    };

    await sendMemoTemplate(templateObject);
    await setLastRun(name, now);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
