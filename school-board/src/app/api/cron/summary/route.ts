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

function num(n: number) {
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

    // 2번째 사진처럼 "최근" 행에 붙일 문장 (너무 길면 … 될 수 있음)
    const recentLine = `새글 ${np}개 · 새댓글 ${nc}개 · 신고 ${reports.newReports}건 · 미처리 ${reports.openReports}건`;

    const templateObject = {
      object_type: "feed",
      content: {
        title: `📊 Square 일일 요약 (${today})`,
        description: "최근 변화 요약입니다.",
        // ✅ 큰 썸네일은 안 쓰고(없애고), 프로필 로고만 사용
        link: { web_url: siteUrl, mobile_web_url: siteUrl },
      },
      item_content: {
        // ✅ 상단 작은 프로필 로고
        profile_text: "Square",
        profile_image_url: logoUrl,

        // ✅ 여기서 item_op가 “오른쪽 끝”으로 감 (2번째 사진 스타일)
        items: [
          { item: "전체 글", item_op: `${num(tp)}개` },
          { item: "전체 댓글", item_op: `${num(tc)}개` },
          { item: "총 회원", item_op: `${num(tm)}명` },
          { item: "누적 방문", item_op: `${num(tv)}회` },
        ],

        // ✅ "최근" 행(2번째 사진처럼)
        sum: "최근",
        sum_op: recentLine,
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
