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

    // ✅ OG 이미지 URL (캐시 방지용 v 파라미터 포함)
    const ogUrl =
      `${siteUrl}/api/og/daily` +
      `?title=${encodeURIComponent(`Square Daily Summary (${today})`)}` +
      `&sub=${encodeURIComponent(`New: posts ${np} · comments ${nc} · reports ${reports.newReports}`)}` +
      `&logo=${encodeURIComponent(logoUrl)}` +
      `&tp=${tp}&tc=${tc}&tm=${tm}&tv=${tv}` +
      `&np=${np}&nc=${nc}&nr=${reports.newReports}&or=${reports.openReports}` +
      `&v=${Date.now()}`;

    // 텍스트는 짧게(카톡 UI에서 어차피 잘릴 수 있으니)
    const shortDesc = `총합/요약은 카드 이미지에서 확인`;

    const templateObject = {
      object_type: "feed",
      content: {
        title: `📊 Square 일일 요약 (${today})`,
        description: shortDesc,
        image_url: ogUrl, // ✅ 여기서 예쁜 카드 이미지가 뜸
        link: { web_url: siteUrl, mobile_web_url: siteUrl },
      },
      item_content: {
        profile_text: "Square",
        profile_image_url: logoUrl,
        // ✅ 아래 items는 “백업용”(이미지에 이미 다 있음) — 짧게만
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
