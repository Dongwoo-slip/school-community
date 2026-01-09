import { NextRequest, NextResponse } from "next/server";
import { getNeisBase, getNeisKey, getSchoolCodesFromEnv, neisFetchJson } from "@/lib/neis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function kstNowAsUtcDate() {
  // KST(UTC+9)을 UTC Date로 옮겨 요일 계산 안정화
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function ymdUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

function getWeekMonFri(weekOffset: number) {
  const now = kstNowAsUtcDate();
  const day = now.getUTCDay(); // 0=일..6=토 (KST 기준)
  const diffToMon = (day + 6) % 7; // 월=0
  const mon = new Date(now);
  mon.setUTCDate(now.getUTCDate() - diffToMon);

  // ✅ 주 이동: offset(주) 만큼 이동
  mon.setUTCDate(mon.getUTCDate() + weekOffset * 7);

  const days: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(mon);
    d.setUTCDate(mon.getUTCDate() + i);
    days.push(ymdUTC(d));
  }
  return days; // [월..금] YYYYMMDD
}

export async function GET(req: NextRequest) {
  try {
    const key = getNeisKey(); // ✅ NEIS_KEY
    const base = getNeisBase();

    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade") ?? "2";
    const classNm = searchParams.get("class") ?? "7";

    // weekOffset: -1=저번주, 0=이번주, +1=다음주 ...
    const rawOffset = searchParams.get("weekOffset") ?? "0";
    let weekOffset = Number.parseInt(rawOffset, 10);
    if (!Number.isFinite(weekOffset)) weekOffset = 0;
    // 너무 큰 값 방지(대충 1년 범위)
    if (weekOffset > 52) weekOffset = 52;
    if (weekOffset < -52) weekOffset = -52;

    const codes = getSchoolCodesFromEnv();
    if (!codes) {
      throw new Error("Missing school codes. Set NEIS_ATPT_CODE and NEIS_SCHOOL_CODE");
    }

    const days = getWeekMonFri(weekOffset);
    const dayMap = new Map(days.map((d, i) => [d, i]));

    // ✅ 고등학교 시간표: hisTimetable
    const url =
      `${base}/hisTimetable?KEY=${encodeURIComponent(key)}` +
      `&Type=json&pIndex=1&pSize=1000` +
      `&ATPT_OFCDC_SC_CODE=${encodeURIComponent(codes.ATPT_OFCDC_SC_CODE)}` +
      `&SD_SCHUL_CODE=${encodeURIComponent(codes.SD_SCHUL_CODE)}` +
      `&GRADE=${encodeURIComponent(grade)}` +
      `&CLASS_NM=${encodeURIComponent(classNm)}` +
      `&TI_FROM_YMD=${days[0]}&TI_TO_YMD=${days[4]}`;

    const data = await neisFetchJson(url);
    const rows = data?.hisTimetable?.[1]?.row ?? [];

    const grid: string[][] = Array.from({ length: 7 }, () => Array(5).fill(""));

    for (const r of rows) {
      const d = String(r.ALL_TI_YMD ?? "");
      const col = dayMap.get(d);
      if (col === undefined) continue;

      const p = Number(r.PERIO);
      if (!Number.isFinite(p) || p < 1 || p > 7) continue;

      const subject = String(r.ITRT_CNTNT ?? "").trim();
      grid[p - 1][col] = subject || "";
    }

    return NextResponse.json({
      ok: true,
      grade,
      classNm,
      weekOffset,
      days,
      grid,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
