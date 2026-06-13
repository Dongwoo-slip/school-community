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
  return `${mm}.${dd} ${hh}:${mi}`;
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

      await fetch("/api/messages/read", { method: "POST", credentials: "include" }).catch(() => null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const unreadCount = useMemo(() => {
    if (typeof unreadServer === "number") return unreadServer;
    return rows.filter((r) => !r.read && (r.recipient_id ?? r.receiver_id) === me.userId).length;
  }, [rows, me.userId, unreadServer]);

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <section className="glass p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              쪽지함
            </h2>
            <p className="mt-1 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              관리자에게 받은 안내와 보낸 쪽지를 확인합니다.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-right">
            <span className="block text-[10px] font-medium text-slate-500">안 읽은 쪽지</span>
            <span className="block text-sm font-semibold text-slate-950">{unreadCount.toLocaleString()}개</span>
          </div>
        </div>
      </section>

      {/* Message List */}
      <div>
        {loading ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse border-b border-slate-100 bg-slate-50 last:border-b-0" />
            ))}
          </div>
        ) : err ? (
          <div className="rounded-lg border border-rose-200 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-rose-600">{err}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <p className="text-sm font-medium text-slate-500">
              받거나 보낸 쪽지가 없습니다.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {rows.map((m) => {
              const recipient = (m.recipient_id ?? m.receiver_id) ?? "";
              const isReceived = recipient === me.userId;
              return (
                <div
                  key={m.id}
                  className={`border-b border-slate-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-slate-50 ${!m.read && isReceived ? "bg-sky-50" : "bg-white"
                    }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isReceived ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"}`}>
                        {isReceived ? "관리자로부터" : "내가 보냄"}
                      </span>
                      {!m.read && isReceived && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">새 쪽지</span>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-slate-500">{fmtTime(m.created_at)}</span>
                  </div>
                  <div className="whitespace-pre-wrap break-words text-sm font-normal leading-6 text-slate-700">
                    {m.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
