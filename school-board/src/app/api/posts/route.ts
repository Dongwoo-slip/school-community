import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

const BUCKET = "post-images";

function safeFileExt(name: string) {
  const m = name.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/);
  return m ? m[1] : "png";
}

async function uploadImages(sb: ReturnType<typeof admin>, userId: string, files: File[]) {
  const urls: string[] = [];

  for (const file of files) {
    // 너무 큰 파일 방지(원하면 조절)
    if (file.size > 5 * 1024 * 1024) continue;

    const ext = safeFileExt(file.name);
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const buf = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: file.type || `image/${ext}`, upsert: false });

    if (upErr) continue;

    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }

  return urls;
}

// GET /api/posts?board=free
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const board = searchParams.get("board") ?? "free";

  const sb = admin();

  const { data: posts, error } = await sb
    .from("posts")
    .select("id,title,created_at,view_count,author_id,image_urls")
    .eq("board", board)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = Array.from(new Set((posts ?? []).map((p: any) => p.author_id).filter(Boolean)));
  const profileMap = new Map<string, { username: string | null; role: string | null }>();

  if (ids.length > 0) {
    const { data: profiles } = await sb.from("profiles").select("id,username,role").in("id", ids);
    (profiles ?? []).forEach((pr: any) => {
      profileMap.set(pr.id, { username: pr.username ?? null, role: pr.role ?? "user" });
    });
  }

  const result = (posts ?? []).map((p: any) => ({
    ...p,
    author: profileMap.get(p.author_id) ?? { username: null, role: "user" },
  }));

  return NextResponse.json({ data: result });
}

// POST /api/posts  (로그인 필요)  ✅ JSON / multipart 둘 다 지원
export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const sb = admin();

  const contentType = req.headers.get("content-type") ?? "";

  // ====== 1) multipart(form-data) 처리: 이미지 포함 ======
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();

    const board = String(form.get("board") ?? "free");
    const title = String(form.get("title") ?? "").trim();
    const content = String(form.get("content") ?? "").trim();

    if (title.length < 4) return NextResponse.json({ error: "제목은 4글자 이상" }, { status: 400 });
    if (content.length < 4) return NextResponse.json({ error: "본문은 4글자 이상" }, { status: 400 });

    const files = form.getAll("images").filter((v): v is File => v instanceof File);

    // 이미지 업로드 → public URL 배열 생성
    const image_urls = files.length ? await uploadImages(sb, user.id, files) : [];

    const { data, error } = await sb
      .from("posts")
      .insert({
        board,
        title,
        content,
        author_id: user.id,
        view_count: 0,
        image_urls,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }

  // ====== 2) 기존 JSON 방식 유지(호환) ======
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });

  const board = body.board ?? "free";
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  const image_urls = Array.isArray(body.image_urls) ? body.image_urls.filter((x: any) => typeof x === "string") : [];

  if (title.length < 4) return NextResponse.json({ error: "제목은 4글자 이상" }, { status: 400 });
  if (content.length < 4) return NextResponse.json({ error: "본문은 4글자 이상" }, { status: 400 });

  const { data, error } = await sb
    .from("posts")
    .insert({
      board,
      title,
      content,
      author_id: user.id,
      view_count: 0,
      image_urls,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
