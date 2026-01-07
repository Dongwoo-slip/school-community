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

    // ✅ description은 짧게(길면 … 처리됨)
    const desc = `최근: 글 ${np} · 댓글 ${nc} · 신고 ${reports.newReports}`;

    // ✅ sum/sum_op은 너무 길면 잘려서, 11자 내로 최대한 압축
    // 예: 글3/댓5/신1/미0
    const sumOp = `글${np}/댓${nc}/신${reports.newReports}/미${reports.openReports}`;

    const templateObject = {
      object_type: "feed",
      content: {
        title: `📊 Square 일일 요약 (${today})`,
        description: desc,
        // ✅ 여기 image_url을 넣으면 “큰 썸네일”이 생김 → 넣지 않음
        link: { web_url: siteUrl, mobile_web_url: siteUrl },
      },
      item_content: {
        // ✅ 작은 원형 프로필 로고
        profile_text: "Square",
        profile_image_url: logoUrl,

        // ✅ 숫자들은 item_op에 넣으면 오른쪽 정렬로 보이기 좋음
        items: [
          { item: "전체글", item_op: fmt(tp) },
          { item: "댓글", item_op: fmt(tc) },
          { item: "회원", item_op: fmt(tm) },
          { item: "방문", item_op: fmt(tv) },
        ],

        // ✅ “누적방문 밑에 같이” 요약 한 줄
        sum: "최근",
        sum_op: sumOp,
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
