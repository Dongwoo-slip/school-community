export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const CreateSchema = z.object({
  board: z.string().default("free"),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(20000),
  password: z.string().min(4).max(50),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const board = searchParams.get("board") ?? "free";

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("posts")
    .select("id,title,created_at,view_count")
    .eq("board", board)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { board, title, content, password } = parsed.data;
  const password_hash = await bcrypt.hash(password, 10);

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("posts")
    .insert({ board, title, content, password_hash })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
