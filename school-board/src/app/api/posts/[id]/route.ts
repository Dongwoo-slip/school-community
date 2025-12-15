import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import bcrypt from "bcryptjs";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const DeleteSchema = z.object({
  password: z.string().min(4).max(50),
});

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const sb = supabaseServer();

  const { data: post, error } = await sb
    .from("posts")
    .select("id,title,content,created_at,view_count,is_deleted")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  if (post.is_deleted) return NextResponse.json({ error: "deleted" }, { status: 404 });

  const nextView = (post.view_count ?? 0) + 1;
  await sb.from("posts").update({ view_count: nextView }).eq("id", id);

  return NextResponse.json({ data: { ...post, view_count: nextView } });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = DeleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "비밀번호를 확인해줘" }, { status: 400 });
  }

  const sb = supabaseServer();

  const { data: post, error } = await sb
    .from("posts")
    .select("password_hash,is_deleted")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (post.is_deleted) return NextResponse.json({ ok: true });

  const ok = await bcrypt.compare(parsed.data.password, post.password_hash);
  if (!ok) return NextResponse.json({ error: "wrong_password" }, { status: 403 });

  const { error: delErr } = await sb.from("posts").update({ is_deleted: true }).eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
