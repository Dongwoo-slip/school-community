import { NextRequest, NextResponse } from "next/server";
import { sendMemoTemplate } from "@/lib/kakao";
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

export async function GET(req: NextRequest) {
  const rawAuth = req.headers.get("authorization") || "";
  const got = normalizeAuth(rawAuth);
  const secret = (process.env.CRON_SECRET || "").trim();

  if (!secret || got !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const name = "kakao_daily_summary";

  try {
    const last = await getLastRun(name);
    const now = new Date();

    // ✅ 총합(먼저 표시)
    const [totalPosts, totalComments, totalMembers, totalVisits] = await Promise.all([
      getTotalPostsCount(),
      getTotalCommentsCount(),
      getTotalMembersCount(),
      getTotalVisitsCount(),
    ]);

    // ✅ 지난 실행 이후(하루 1번이면 보통 24시간치)
    const [newPosts, newComments, reports] = await Promise.all([
      getNewPostsCount(last),
      getNewCommentsCount(last),
      getReportsSummary(last),
    ]);

    const siteUrl = process.env.SITE_URL || "https://cjconnect2.vercel.app";
    const logoUrl = `${siteUrl}/logo.png`;
    const today = kstToday();

    const templateObject = {
      object_type: "feed",
      content: {
        title: `📊 Square 일일 요약 (${today})`,
        description:
          `총합 현황과 최근 변경사항을 정리했어요.\n` +
          `- 최근 새 글: ${newPosts}개 / 새 댓글: ${newComments}개\n` +
          `- 최근 새 신고: ${reports.newReports}건 (미처리 ${reports.openReports}건)`,
        image_url: logoUrl,
        link: { web_url: siteUrl, mobile_web_url: siteUrl },
      },
      item_content: {
        profile_text: "Square",
        profile_image_url: logoUrl,
        // ✅ 여기 items의 앞 4개가 “먼저 표시”됨 (표처럼 보임)
        items: [
          { item: "전체 글 수", item_op: `${totalPosts}개` },
          { item: "전체 댓글 수", item_op: `${totalComments}개` },
          { item: "총 회원 수", item_op: `${totalMembers}명` },
          { item: "누적 방문 수", item_op: `${totalVisits}회` },

          // (선택) 아래는 추가 정보 — 원하면 빼도 됨
          { item: "최근 새 글", item_op: `${newPosts}개` },
          { item: "최근 새 댓글", item_op: `${newComments}개` },
        ],
      },
      buttons: [
        {
          title: "사이트 열기",
          link: { web_url: siteUrl, mobile_web_url: siteUrl },
        },
        {
          title: "관리/확인",
          link: { web_url: `${siteUrl}/community/free`, mobile_web_url: `${siteUrl}/community/free` },
        },
      ],
    };

    await sendMemoTemplate(templateObject);
    await setLastRun(name, now);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
