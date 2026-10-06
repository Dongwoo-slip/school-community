import { NextRequest, NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MessageRow = {
  id: string;
  sender_id: string | null;
  receiver_id?: string | null;
  recipient_id?: string | null;
  content: string;
  created_at: string;
  read: boolean | null;
};

async function getUserId() {
  const authed = await createAuthedClient();
  const { data } = await authed.auth.getUser();
  return data.user?.id ?? null;
}

function normRow(r: MessageRow) {
  // 프론트 호환: recipient_id로도 쓰게 만들어줌
  if (r?.recipient_id && !r?.receiver_id) r.receiver_id = r.recipient_id;
  if (r?.receiver_id && !r?.recipient_id) r.recipient_id = r.receiver_id;
  return r;
}

function mergeRows(rows: MessageRow[], offset: number, limit: number) {
  const byId = new Map<string, MessageRow>();
  for (const row of rows) {
    if (!row?.id) continue;
    byId.set(row.id, normRow(row));
  }

  return Array.from(byId.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(offset, offset + limit);
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const supa = adminClient();
    const url = new URL(req.url);
    const limitParam = Number(url.searchParams.get("limit") ?? "50");
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 50, 1), 100);
    const offsetParam = Number(url.searchParams.get("offset") ?? "0");
    const offset = Math.max(Number.isFinite(offsetParam) ? offsetParam : 0, 0);
    const countOnly = url.searchParams.get("countOnly") === "1";

    async function unreadCount(column: "receiver_id" | "recipient_id") {
      return supa
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq(column, userId)
        .eq("read", false);
    }

    let unread = 0;
    {
      const { count, error } = await unreadCount("receiver_id");
      if (!error) unread = count ?? 0;
      else if (String(error.message || "").toLowerCase().includes("receiver_id")) {
        const { count: count2, error: error2 } = await unreadCount("recipient_id");
        if (error2) return NextResponse.json({ error: error2.message }, { status: 500 });
        unread = count2 ?? 0;
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (countOnly) {
      console.log(JSON.stringify({
        level: "info",
        route: "/api/messages/inbox",
        mode: "countOnly",
        ms: Date.now() - start,
        unread,
      }));
      return NextResponse.json({ data: [], unread }, { status: 200 });
    }

    // 1) receiver_id로 조회 시도
    let rows: MessageRow[] = [];
    {
      const queryLimit = offset + limit;
      const incoming = await supa
        .from("messages")
        .select("id, sender_id, receiver_id, recipient_id, content, created_at, read")
        .eq("receiver_id", userId)
        .order("created_at", { ascending: false })
        .range(0, queryLimit - 1);

      const sentInquiries = await supa
        .from("messages")
        .select("id, sender_id, receiver_id, recipient_id, content, created_at, read")
        .eq("sender_id", userId)
        .like("content", "[문의]%")
        .order("created_at", { ascending: false })
        .range(0, queryLimit - 1);

      if (!incoming.error && !sentInquiries.error) {
        rows = mergeRows([
          ...(Array.isArray(incoming.data) ? incoming.data : []),
          ...(Array.isArray(sentInquiries.data) ? sentInquiries.data : []),
        ], offset, limit);
      } else if (
        String(incoming.error?.message || sentInquiries.error?.message || "")
          .toLowerCase()
          .includes("receiver_id")
      ) {
        // receiver_id 컬럼이 없으면 recipient_id로 재시도
        const incoming2 = await supa
          .from("messages")
          .select("id, sender_id, recipient_id, content, created_at, read")
          .eq("recipient_id", userId)
          .order("created_at", { ascending: false })
          .range(0, queryLimit - 1);

        const sentInquiries2 = await supa
          .from("messages")
          .select("id, sender_id, recipient_id, content, created_at, read")
          .eq("sender_id", userId)
          .like("content", "[문의]%")
          .order("created_at", { ascending: false })
          .range(0, queryLimit - 1);

        if (incoming2.error) return NextResponse.json({ error: incoming2.error.message }, { status: 500 });
        if (sentInquiries2.error) return NextResponse.json({ error: sentInquiries2.error.message }, { status: 500 });

        rows = mergeRows([
          ...(Array.isArray(incoming2.data) ? incoming2.data as MessageRow[] : []),
          ...(Array.isArray(sentInquiries2.data) ? sentInquiries2.data as MessageRow[] : []),
        ], offset, limit);
      } else {
        const error = incoming.error ?? sentInquiries.error;
        return NextResponse.json({ error: error?.message ?? "쪽지 목록을 불러오지 못했습니다." }, { status: 500 });
      }
    }

    console.log(JSON.stringify({
      level: "info",
      route: "/api/messages/inbox",
      mode: "list",
      ms: Date.now() - start,
      limit,
      offset,
      rows: rows.length,
      unread,
    }));

    return NextResponse.json({ data: rows, unread, hasMore: rows.length === limit }, { status: 200 });
  } catch (e: unknown) {
    console.error(JSON.stringify({
      level: "error",
      route: "/api/messages/inbox",
      ms: Date.now() - start,
      error: e instanceof Error ? e.message : "서버 오류",
    }));
    return NextResponse.json({ error: e instanceof Error ? e.message : "서버 오류" }, { status: 500 });
  }
}
