"use client";

import { useEffect, useMemo, useState } from "react";
import { useFreeBoard } from "../layout";

type Dm = {
  id: string;
  sender_id: string;
  receiver_id?: string | null;
  recipient_id?: string | null;
  content: string;
  created_at: string;
  read: boolean;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

function norm(r: Dm): Dm {
  if (r.recipient_id && !r.receiver_id) r.receiver_id = r.recipient_id;
  if (r.receiver_id && !r.recipient_id) r.recipient_id = r.receiver_id;
  return r;
}

export default function MessagesClient() {
  const { me } = useFreeBoard();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Dm[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [unreadServer, setUnreadServer] = useState<number>(0);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/messages/inbox", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json?.error ?? "불러오기 실패");
        setRows([]);
        setUnreadServer(0);
        return;
      }
      const arr = (Array.isArray(json?.data) ? json.data : []).map(norm);
      setRows(arr);
      setUnreadServer(typeof json?.unread === "number" ? json.unread : 0);

      // ✅ 쪽지함 들어오면 읽음 처리
      await fetch("/api/messages/read", { method: "POST", credentials: "include" }).catch(() => null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const unreadCount = useMemo(() => {
    // 서버 unread 우선
    if (typeof unreadServer === "number") return unreadServer;
    return rows.filter((r) => !r.read && (r.recipient_id ?? r.receiver_id) === me.userId).length;
  }, [rows, me.userId, unreadServer]);

  return (
    <div className="border border-slate-300 bg-white p-4 text-slate-900">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-extrabold text-slate-900">✉ 쪽지함</div>
        <div className="text-[12px] text-slate-700">미확인 {unreadCount}</div>
      </div>

      <div className="mt-2 text-[12px] text-slate-600">
        {me.userId ? "관리자 쪽지는 여기서 확인할 수 있어요." : "로그인이 필요합니다."}
      </div>

      {loading ? <div className="mt-3 text-[12px] text-slate-700">불러오는 중…</div> : null}
      {err ? <div className="mt-3 text-[12px] text-rose-600">{err}</div> : null}

      {!loading && !err && rows.length === 0 ? (
        <div className="mt-3 text-[12px] text-slate-700">쪽지가 없습니다.</div>
      ) : null}

      <ul className="mt-3 divide-y divide-slate-100">
        {rows.map((m) => {
          const recipient = (m.recipient_id ?? m.receiver_id) ?? "";
          const isReceived = recipient === me.userId;
          return (
            <li key={m.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[12px] font-semibold text-slate-900">
                  {isReceived ? "관리자로부터" : "내가 보냄"}
                  {!m.read && isReceived ? <span className="ml-2 text-[11px] text-rose-600 font-extrabold">NEW</span> : null}
                </div>
                <div className="text-[11px] text-slate-500">{fmtTime(m.created_at)}</div>
              </div>
              <div className="mt-1 text-[12px] text-slate-900 whitespace-pre-wrap break-words">{m.content}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
