import { NextRequest, NextResponse } from "next/server";
import { getNeisBase, getNeisKey, getSchoolCodesFromEnv, neisFetchJson } from "@/lib/neis";
import { adminClient } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type TimetableResponse = {
  ok: true;
  hasData: boolean;
  grade: string;
  classNm: string;
  weekOffset: number;
  days: string[];
  grid: string[][];
  source: "cache" | "neis";
  cachedAt: string | null;
};

type TimetableCacheRow = {
  cache_key: string;
  grade: string;
  class_nm: string;
  week_offset: number;
  days: string[];
  grid: string[][];
  has_data: boolean;
  fetched_at: string;
  expires_at: string;
};

type NeisTimetableRow = {
  ALL_TI_YMD?: string | number | null;
  PERIO?: string | number | null;
  ITRT_CNTNT?: string | null;
};

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
  mon.setUTCDate(mon.getUTCDate() + weekOffset * 7);

  const days: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(mon);
    d.setUTCDate(mon.getUTCDate() + i);
    days.push(ymdUTC(d));
  }
  return days;
}

function normalizeNumberParam(value: string | null, fallback: string, min: number, max: number) {
  const num = Number.parseInt(value ?? fallback, 10);
  if (!Number.isFinite(num)) return fallback;
  return String(Math.min(Math.max(num, min), max));
}

function isCacheTableMissing(error: { message?: string; code?: string } | null | undefined) {
  const message = String(error?.message ?? "").toLowerCase();
  return error?.code === "42P01" || message.includes("timetable_cache");
}

async function readCache(cacheKey: string) {
  const supa = adminClient();
  const { data, error } = await supa
    .from("timetable_cache")
    .select("cache_key,grade,class_nm,week_offset,days,grid,has_data,fetched_at,expires_at")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    if (isCacheTableMissing(error)) return null;
    throw error;
  }

  return data as TimetableCacheRow | null;
}

async function writeCache(payload: TimetableResponse, cacheKey: string) {
  const supa = adminClient();
  const fetchedAt = new Date();
  const expiresAt = new Date(fetchedAt.getTime() + 60 * 60 * 1000);

  const { error } = await supa.from("timetable_cache").upsert(
    {
      cache_key: cacheKey,
      grade: payload.grade,
      class_nm: payload.classNm,
      week_offset: payload.weekOffset,
      days: payload.days,
      grid: payload.grid,
      has_data: payload.hasData,
      fetched_at: fetchedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: "cache_key" }
  );

  if (error && !isCacheTableMissing(error)) {
    console.error(JSON.stringify({
      level: "warning",
      route: "/api/timetable",
      msg: "cache_write_failed",
      error: error.message,
    }));
  }
}

function emptyGrid() {
  return Array.from({ length: 7 }, () => Array(5).fill(""));
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const grade = normalizeNumberParam(searchParams.get("grade"), "2", 1, 3);
    const classNm = normalizeNumberParam(searchParams.get("class"), "7", 1, 11);

    let weekOffset = Number.parseInt(searchParams.get("weekOffset") ?? "0", 10);
    if (!Number.isFinite(weekOffset)) weekOffset = 0;
    if (weekOffset > 52) weekOffset = 52;
    if (weekOffset < -52) weekOffset = -52;

    const codes = getSchoolCodesFromEnv();
    if (!codes) {
      throw new Error("Missing school codes. Set NEIS_ATPT_CODE and NEIS_SCHOOL_CODE");
    }

    const days = getWeekMonFri(weekOffset);
    const cacheKey = [
      codes.ATPT_OFCDC_SC_CODE,
      codes.SD_SCHUL_CODE,
      grade,
      classNm,
      days[0],
      days[4],
    ].join(":");

    const cached = await readCache(cacheKey);
    if (cached) {
      console.log(JSON.stringify({
        level: "info",
        route: "/api/timetable",
        source: "cache",
        ms: Date.now() - start,
        grade,
        classNm,
        weekOffset,
      }));

      return NextResponse.json({
        ok: true,
        hasData: Boolean(cached.has_data),
        grade: cached.grade,
        classNm: cached.class_nm,
        weekOffset: cached.week_offset,
        days: Array.isArray(cached.days) ? cached.days : days,
        grid: Array.isArray(cached.grid) ? cached.grid : emptyGrid(),
        source: "cache",
        cachedAt: cached.fetched_at,
      } satisfies TimetableResponse);
    }

    const key = getNeisKey();
    const base = getNeisBase();
    const dayMap = new Map(days.map((d, i) => [d, i]));
    const grid: string[][] = emptyGrid();

    const url =
      `${base}/hisTimetable?KEY=${encodeURIComponent(key)}` +
      `&Type=json&pIndex=1&pSize=1000` +
      `&ATPT_OFCDC_SC_CODE=${encodeURIComponent(codes.ATPT_OFCDC_SC_CODE)}` +
      `&SD_SCHUL_CODE=${encodeURIComponent(codes.SD_SCHUL_CODE)}` +
      `&GRADE=${encodeURIComponent(grade)}` +
      `&CLASS_NM=${encodeURIComponent(classNm)}` +
      `&TI_FROM_YMD=${days[0]}&TI_TO_YMD=${days[4]}`;

    const data = await neisFetchJson(url);
    const rows = Array.isArray(data?.hisTimetable?.[1]?.row)
      ? (data.hisTimetable[1].row as NeisTimetableRow[])
      : [];

    for (const r of rows) {
      const d = String(r.ALL_TI_YMD ?? "");
      const col = dayMap.get(d);
      if (col === undefined) continue;

      const p = Number(r.PERIO);
      if (!Number.isFinite(p) || p < 1 || p > 7) continue;

      const subject = String(r.ITRT_CNTNT ?? "").trim();
      grid[p - 1][col] = subject || "";
    }

    const payload: TimetableResponse = {
      ok: true,
      hasData: rows.length > 0,
      grade,
      classNm,
      weekOffset,
      days,
      grid,
      source: "neis",
      cachedAt: null,
    };

    await writeCache(payload, cacheKey);

    console.log(JSON.stringify({
      level: "info",
      route: "/api/timetable",
      source: "neis",
      ms: Date.now() - start,
      grade,
      classNm,
      weekOffset,
      rows: rows.length,
    }));

    return NextResponse.json(payload);
  } catch (e: unknown) {
    console.error(JSON.stringify({
      level: "error",
      route: "/api/timetable",
      ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    }));
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
