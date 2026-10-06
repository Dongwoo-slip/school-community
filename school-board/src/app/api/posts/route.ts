/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { awardPoints } from "@/lib/points";
import { AUTHOR_PROFILE_SELECT } from "@/lib/authorDisplay";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

const PUBLIC_AUTHOR_PROFILE_SELECT = "username, role, points";
const LIST_COLUMNS = "id,title,created_at,view_count,like_count,author_id,poll";
const SUMMARY_COLUMNS = "id,title,created_at,view_count,like_count,author_id";
let cachedAdminIds: { value: string[]; expiresAt: number } | null = null;

async function getAdminIds(sb: ReturnType<typeof admin>) {
  const now = Date.now();
  if (cachedAdminIds && cachedAdminIds.expiresAt > now) return cachedAdminIds.value;

  const { data, error } = await sb
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(50);

  if (error) throw error;
  const value = (Array.isArray(data) ? data : [])
    .map((row) => String(row?.id ?? ""))
    .filter(Boolean);

  cachedAdminIds = { value, expiresAt: now + 5 * 60 * 1000 };
  return value;
}

async function isVerifiedWriter(sb: ReturnType<typeof admin>, userId: string) {
  const { data: profile, error } = await sb
    .from("profiles")
    .select("role, student_verified, student_no, student_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (profile?.role === "admin") return true;
  if (profile?.student_verified || profile?.student_no || profile?.student_name) return true;

  const { data: verification, error: verificationError } = await sb
    .from("student_verification_codes")
    .select("id")
    .eq("used_by", userId)
    .maybeSingle();

  if (verificationError) throw verificationError;
  return Boolean(verification?.id);
}

// GET /api/posts?board=free
export async function GET(req: Request) {
  const start = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const board = (searchParams.get("board") ?? "free").trim() || "free";
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const limit = limitRaw === null ? null : Math.min(Math.max(Number(limitRaw) || 15, 1), 100);
    const offset = Math.max(Number(offsetRaw ?? "0") || 0, 0);
    const q = (searchParams.get("q") ?? "").trim();
    const mine = searchParams.get("mine") === "1";
    const pinAdmin = searchParams.get("pinAdmin") === "1";
    const summary = searchParams.get("summary") === "1";
    const countMode = searchParams.get("count") ?? "exact";

    const sb = admin();
    const authed = await createAuthedClient();
    const { data: authData } = await authed.auth.getUser();
    const user = authData.user;

    let role = "guest";
    if (user) {
      const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
      role = profile?.role ?? "user";
    }

    const profileSelect = role === "admin" ? AUTHOR_PROFILE_SELECT : PUBLIC_AUTHOR_PROFILE_SELECT;
    const columns = summary ? SUMMARY_COLUMNS : LIST_COLUMNS;

    function applyCommon(query: any) {
      let next = query
        .eq("board", board)
        .eq("is_deleted", false);

      if (q) next = next.ilike("title", `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
      if (mine) next = user ? next.eq("author_id", user.id) : next.eq("author_id", "__no_user__");
      return next;
    }

    function applyAuthorKind(query: any, kind: "admin" | "normal" | null, adminIds: string[]) {
      if (!kind) return query;
      if (adminIds.length === 0) {
        return kind === "admin" ? query.eq("author_id", "__no_admin__") : query;
      }
      const idList = `(${adminIds.join(",")})`;
      if (kind === "admin") return query.in("author_id", adminIds);
      return query.not("author_id", "in", idList);
    }

    async function countSegment(kind?: "admin" | "normal", adminIds: string[] = []) {
      let query = sb
        .from("posts")
        .select("id", { count: countMode === "planned" ? "planned" : "exact", head: true });

      query = applyCommon(query);
      query = applyAuthorKind(query, kind ?? null, adminIds);

      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    }

    async function fetchSegment(kind: "admin" | "normal" | null, segmentOffset: number, segmentLimit: number, adminIds: string[] = []) {
      if (segmentLimit <= 0) return [];

      let query = sb
        .from("posts")
        .select(`${columns}, author:profiles(${profileSelect})`);

      query = applyCommon(query);
      query = applyAuthorKind(query, kind, adminIds);

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(segmentOffset, segmentOffset + segmentLimit - 1);

      if (error) throw error;
      return Array.isArray(data) ? data : [];
    }

    if (limit !== null) {
      if (countMode === "none") {
        if (pinAdmin && !mine) {
          const adminIds = await getAdminIds(sb);
          const adminRows = await fetchSegment("admin", 0, 100, adminIds);
          const rows: any[] = [];

          if (offset < adminRows.length) {
            rows.push(...adminRows.slice(offset, offset + limit));
          }

          const remaining = limit - rows.length;
          let hasMore = offset + rows.length < adminRows.length;

          if (remaining > 0) {
            const normalOffset = Math.max(0, offset - adminRows.length);
            const normalRows = await fetchSegment("normal", normalOffset, remaining + 1, adminIds);
            rows.push(...normalRows.slice(0, remaining));
            hasMore = normalRows.length > remaining;
          }

          console.log(JSON.stringify({
            level: "info",
            route: "/api/posts",
            mode: "paged-pinned-no-count",
            ms: Date.now() - start,
            board,
            limit,
            offset,
            rows: rows.length,
            hasMore,
          }));

          return NextResponse.json({
            data: rows,
            count: null,
            hasMore,
            limit,
            offset,
          });
        }

        const rowsPlusOne = await fetchSegment(null, offset, limit + 1);
        const rows = rowsPlusOne.slice(0, limit);
        const hasMore = rowsPlusOne.length > limit;

        console.log(JSON.stringify({
          level: "info",
          route: "/api/posts",
          mode: "paged-no-count",
          ms: Date.now() - start,
          board,
          limit,
          offset,
          rows: rows.length,
          hasMore,
        }));

        return NextResponse.json({
          data: rows,
          count: null,
          hasMore,
          limit,
          offset,
        });
      }

      if (pinAdmin && !mine) {
        const adminIds = await getAdminIds(sb);
        const [adminCount, normalCount] = await Promise.all([
          countSegment("admin", adminIds),
          countSegment("normal", adminIds),
        ]);
        const total = adminCount + normalCount;
        const rows: any[] = [];

        if (offset < adminCount) {
          const adminLimit = Math.min(limit, adminCount - offset);
          rows.push(...await fetchSegment("admin", offset, adminLimit, adminIds));
        }

        const remaining = limit - rows.length;
        if (remaining > 0) {
          const normalOffset = Math.max(0, offset - adminCount);
          rows.push(...await fetchSegment("normal", normalOffset, remaining, adminIds));
        }

        console.log(JSON.stringify({
          level: "info",
          route: "/api/posts",
          mode: "paged-pinned",
          ms: Date.now() - start,
          board,
          limit,
          offset,
          rows: rows.length,
          total,
        }));

        return NextResponse.json({
          data: rows,
          count: total,
          hasMore: offset + rows.length < total,
          limit,
          offset,
        });
      }

      const total = await countSegment();
      const rows = await fetchSegment(null, offset, limit);

      console.log(JSON.stringify({
        level: "info",
        route: "/api/posts",
        mode: "paged",
        ms: Date.now() - start,
        board,
        limit,
        offset,
        rows: rows.length,
        total,
      }));

      return NextResponse.json({
        data: rows,
        count: total,
        hasMore: offset + rows.length < total,
        limit,
        offset,
      });
    }

    const { data: posts, error } = await sb
      .from("posts")
      .select(`*, author:profiles(${profileSelect})`)
      .eq("board", board)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    console.log(JSON.stringify({
      level: "info",
      route: "/api/posts",
      mode: "legacy-full",
      ms: Date.now() - start,
      board,
      rows: posts?.length ?? 0,
    }));

    return NextResponse.json({ data: posts ?? [] });
  } catch (e: unknown) {
    console.error(JSON.stringify({
      level: "error",
      route: "/api/posts",
      ms: Date.now() - start,
      error: e instanceof Error ? e.message : "unknown error",
    }));
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown error" }, { status: 500 });
  }
}

// POST /api/posts (로그인 필요)
export async function POST(req: Request) {
  const authed = await createAuthedClient();
  const { data: authData } = await authed.auth.getUser();
  const user = authData.user;

  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });

  const board = String(body.board ?? "free").trim();
  const title = String(body.title ?? "").trim().slice(0, 200);
  const content = String(body.content ?? "").trim().slice(0, 5000);

  if (title.length < 1) return NextResponse.json({ error: "제목을 입력하세요" }, { status: 400 });
  if (content.length < 1) return NextResponse.json({ error: "본문을 입력하세요" }, { status: 400 });

  const image_urls = Array.isArray(body.image_urls)
    ? body.image_urls.map((x: any) => String(x ?? "").trim()).filter(Boolean).slice(0, 10)
    : [];

  const sb = admin();

  try {
    const verified = await isVerifiedWriter(sb, user.id);
    if (!verified) {
      return NextResponse.json(
        { error: "개별인증이 필요합니다. 마이페이지에서 인증코드를 등록한 뒤 글을 작성해 주세요.", code: "STUDENT_VERIFICATION_REQUIRED" },
        { status: 403 }
      );
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "인증 상태를 확인하지 못했습니다." }, { status: 500 });
  }

  // ✅ 도배 방지: 30초 이내 작성 여부 확인
  const { data: lastPost } = await sb
    .from("posts")
    .select("created_at")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastPost) {
    const diff = Date.now() - new Date(lastPost.created_at).getTime();
    if (diff < 30000) {
      return NextResponse.json({ error: "너무 자주 글을 올릴 수 없습니다. 30초 후에 다시 시도하세요." }, { status: 429 });
    }
  }

  // ✅ 투표(옵션 텍스트만 받으면 서버에서 id 붙여 저장)
  let poll: any = null;
  if (body.poll) {
    const q = String(body.poll.question ?? "투표").trim().slice(0, 50);
    const opts = Array.isArray(body.poll.options) ? body.poll.options : [];
    const clean = opts.map((x: any) => String(x ?? "").trim()).filter(Boolean);

    if (clean.length < 2) return NextResponse.json({ error: "투표 항목은 최소 2개" }, { status: 400 });
    if (clean.length > 10) return NextResponse.json({ error: "투표 항목은 최대 10개" }, { status: 400 });

    poll = {
      question: q || "투표",
      options: clean.map((text: string) => ({ id: crypto.randomUUID(), text })),
    };
  }


  const { data, error } = await sb
    .from("posts")
    .insert({
      board,
      title,
      content,
      image_urls,
      poll,
      author_id: user.id,
      view_count: 0,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Failed to create post" }, { status: 500 });

  // ✅ 포인트 증정 (+10) 및 첫 게시물 배지 부여
  try {
    const current = await awardPoints(user, 10);

    // 첫 게시물인지 확인
    const { count } = await sb.from("posts").select("*", { count: "exact", head: true }).eq("author_id", user.id);
    const badges = Array.isArray(current?.badge) ? [...current.badge] : [];
    if (count === 1 && !badges.includes("First Step")) {
      badges.push("First Step");
    }

    await sb.from("profiles").update({ badge: badges }).eq("id", user.id);
  } catch (e) {
    console.error("Failed to update points/badges:", e);
  }

  return NextResponse.json({ id: data.id });
}
