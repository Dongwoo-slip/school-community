import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function GET(req: Request) {
  await signOut();
  return NextResponse.redirect(new URL("/community/free", req.url));
}

export async function POST() {
  await signOut();
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
