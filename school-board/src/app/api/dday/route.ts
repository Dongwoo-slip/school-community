import { NextResponse } from "next/server";
import { adminClient } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

export async function GET() {
  const { data, error } = await adminClient()
    .from("posts")
    .select("id,title,content,created_at,updated_at")
    .eq("board", "dday")
    .eq("is_deleted", false)
    .order("content", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const res = NextResponse.json({
    ok: true,
    data: (data ?? []).map((row) => ({
      id: row.id,
      eventName: row.title ?? "",
      targetDate: row.content ?? "",
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
  });
  res.headers.set("Cache-Control", PUBLIC_CACHE);
  return res;
}
