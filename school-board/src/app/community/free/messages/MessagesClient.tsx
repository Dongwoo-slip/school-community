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
    <div className="space-y-8">
      {/* Header Section */}
      <section className="glass rounded-[2rem] p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <span className="text-3xl">✉️</span> 쪽지함
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-widest">
              Private messages & Notifications
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Unread</span>
            <span className="text-2xl font-black text-sky-400">{unreadCount}</span>
          </div>
        </div>
      </section>

      {/* Message List */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : err ? (
          <div className="glass rounded-2xl p-8 text-center border-rose-500/20">
            <p className="text-sm font-bold text-rose-400">{err}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="glass rounded-[2rem] p-20 text-center">
            <div className="text-5xl mb-6">🏜️</div>
            <p className="text-sm font-medium text-slate-500 italic">
              받거나 보낸 쪽지가 없습니다.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {rows.map((m) => {
              const recipient = (m.recipient_id ?? m.receiver_id) ?? "";
              const isReceived = recipient === me.userId;
              return (
                <div
                  key={m.id}
                  className={`glass-hover flex flex-col rounded-2xl p-6 transition-all ${!m.read && isReceived ? "bg-sky-500/5 ring-1 ring-sky-500/30" : "bg-white/[0.03]"
                    }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-lg ${isReceived ? "bg-indigo-500/20 text-indigo-400" : "bg-sky-500/20 text-sky-400"}`}>
                        {isReceived ? "📥" : "📤"}
                      </div>
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        {isReceived ? "관리자로부터" : "내가 보냄"}
                      </span>
                      {!m.read && isReceived && (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[8px] font-black text-white uppercase">New</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{fmtTime(m.created_at)}</span>
                  </div>
                  <div className="text-sm font-medium leading-relaxed text-slate-300 whitespace-pre-wrap">
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
