import { NextRequest, NextResponse } from "next/server";
import { sendMemoText } from "@/lib/kakao";
import {
  getLastRun,
  setLastRun,
  getNewPostsCount,
  getNewCommentsCount,
  getTodayVisitorsCount,
  getReportsSummary,
} from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const name = "kakao_summary";

  try {
    const last = await getLastRun(name);
    const now = new Date();

    const [newPosts, newComments, todayVisitors, reports] = await Promise.all([
      getNewPostsCount(last),
      getNewCommentsCount(last),
      getTodayVisitorsCount(),
      getReportsSummary(last),
    ]);

    const msg =
`📌 Square 3시간 요약
- 새 글: ${newPosts}개
- 새 댓글: ${newComments}개
- 오늘 방문자: ${todayVisitors}명
- 새 신고: ${reports.newReports}건 (미처리: ${reports.openReports}건)`;

    await sendMemoText(msg);
    await setLastRun(name, now);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
