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

function fmt(n: number) {
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

    // ✅ 길이 짧게(… 방지): 한 줄로, 기호 최소
    const desc = `최근: 글 ${np} 댓글 ${nc} 신고 ${reports.newReports} (미처리 ${reports.openReports})`;

    // ✅ “누적방문 밑에 같이” 보이게 하려면 sum/sum_op 사용
    // (카톡 UI에서 items 아래에 한 줄로 붙음)
    const sumLine = `글 ${np} · 댓글 ${nc} · 신고 ${reports.newReports} · 미처리 ${reports.openReports}`;

    const templateObject = {
      object_type: "feed",
      content: {
        title: `📊 Square 일일 요약 (${today})`,
        description: desc, // 여기 길면 잘리니까 아주 짧게만
        image_url: logoUrl, // 로고만
        link: { web_url: siteUrl, mobile_web_url: siteUrl },
      },
      item_content: {
        profile_text: "Square",
        profile_image_url: logoUrl,
        items: [
          { item: "전체 글", item_op: `${fmt(tp)}개` },
          { item: "전체 댓글", item_op: `${fmt(tc)}개` },
          { item: "총 회원", item_op: `${fmt(tm)}명` },
          { item: "누적 방문", item_op: `${fmt(tv)}회` },
        ],
        // ✅ 누적 방문 “밑에 같이” 한 줄 요약
        sum: "최근 요약",
        sum_op: sumLine,
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
