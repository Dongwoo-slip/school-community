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

    // ✅ "새글..."을 위로 올림(= description). 여기 영역 글씨가 더 작게 나옴.
    // 너무 길면 … 될 수 있으니 한 줄로 압축.
    const desc = `최근: 새글 ${np}개 · 새댓글 ${nc}개 · 신고 ${reports.newReports}건 · 미처리 ${reports.openReports}건`;

    const templateObject = {
      object_type: "feed",
      content: {
        title: `📊 Square 일일 요약 (${today})`,
        description: desc,
        // ✅ 큰 썸네일 방지: image_url 넣지 않음
        link: { web_url: siteUrl, mobile_web_url: siteUrl },
      },
      item_content: {
        // ✅ 작은 프로필 로고 유지
        profile_text: "Square",
        profile_image_url: logoUrl,

        // ✅ 총합 표(오른쪽 정렬 느낌 + 단위)
        items: [
          { item: "전체 글", item_op: `${num(tp)}개` },
          { item: "전체 댓글", item_op: `${num(tc)}개` },
          { item: "총 회원", item_op: `${num(tm)}명` },
          { item: "누적 방문", item_op: `${num(tv)}회` },
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
