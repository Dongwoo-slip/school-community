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

function normalizeAuth(h: string) {
  // "Bearer 0417" / "bearer 0417" / "0417" 전부 허용
  const t = (h || "").trim();
  if (!t) return "";
  const m = t.match(/^bearer\s+(.+)$/i);
  return (m ? m[1] : t).trim();
}

export async function GET(req: NextRequest) {
  const rawAuth = req.headers.get("authorization") || "";
  const got = normalizeAuth(rawAuth);
  const secret = (process.env.CRON_SECRET || "").trim();

  // ✅ 인증
  if (!secret || got !== secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "unauthorized",
        // 🔎 디버그(민감정보 노출 X): 길이만
        debug: {
          hasSecret: !!secret,
          secretLen: secret.length,
          gotLen: got.length,
          hasAuthHeader: !!rawAuth,
        },
      },
      { status: 401 }
    );
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
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
