import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  // ✅ 일단 서버 500부터 제거 (DB 집계는 나중에 안정화 후 붙이기)
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
