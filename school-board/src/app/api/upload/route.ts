import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

function safeName(name: string) {
  // 파일명 안전하게
  return name.replace(/[^\w.\-]+/g, "_");
}

export async function POST(req: Request) {
  // ✅ 로그인 체크(글쓰기랑 동일 정책)
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "formData 파싱 실패" }, { status: 400 });

  const files = form.getAll("files").filter(Boolean) as File[];
  if (!files.length) return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });

  // ✅ 설정: 버킷 이름 (원하는 이름으로)
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "post-images";

  const sb = admin();
  const urls: string[] = [];

  for (const f of files) {
    // 타입/크기 검증
    if (!f.type?.startsWith("image/")) {
      return NextResponse.json({ error: "이미지 파일만 업로드 가능합니다." }, { status: 400 });
    }
    // 10MB 제한(원하면 바꾸기)
    if (f.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "이미지 1장당 10MB 이하만 가능합니다." }, { status: 400 });
    }

    const ext = safeName(f.name).split(".").pop() || "png";
    const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const ab = await f.arrayBuffer();
    const buf = Buffer.from(ab);

    const { error: upErr } = await sb.storage.from(bucket).upload(path, buf, {
      contentType: f.type || "image/*",
      upsert: false,
      cacheControl: "3600",
    });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    // ✅ 버킷이 public 이면 public URL 사용
    const { data: pub } = sb.storage.from(bucket).getPublicUrl(path);
    if (!pub?.publicUrl) {
      return NextResponse.json({ error: "publicUrl 생성 실패(버킷 public 설정 확인)" }, { status: 500 });
    }

    urls.push(pub.publicUrl);
  }

  return NextResponse.json({ urls });
}
