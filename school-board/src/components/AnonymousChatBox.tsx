"use client";

import { useEffect, useMemo, useState } from "react";

type Msg = {
  id: string;
  room: string;
  content: string;
  anon_id: string | null;
  created_at: string;
  user_id: string | null;
};

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

export default function AnonymousChatBox({ meUserId }: { meUserId: string | null }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [netErr, setNetErr] = useState<string | null>(null);

  const [msgsDesc, setMsgsDesc] = useState<Msg[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const [text, setText] = useState("");

  const msgsAsc = useMemo(() => [...msgsDesc].reverse(), [msgsDesc]);
  const oldestCreatedAt = msgsAsc[0]?.created_at ?? null;

  async function loadLatest() {
    try {
      const res = await fetch(`/api/chat?limit=25`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        // ✅ 실패해도 기존 메시지 유지(사라짐 방지)
        setNetErr(json?.error ?? `불러오기 실패 (${res.status})`);
        return;
      }

      setNetErr(null);
      setMsgsDesc(Array.isArray(json.data) ? json.data : []);
      setHasMore(!!json.hasMore);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!oldestCreatedAt) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/chat?limit=25&before=${encodeURIComponent(oldestCreatedAt)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;

      const more = Array.isArray(json.data) ? (json.data as Msg[]) : [];
      setMsgsDesc((prev) => [...prev, ...more]);
      setHasMore(!!json.hasMore);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!meUserId) {
      alert("로그인이 필요합니다.");
      return;
    }

    const content = text.trim();
    if (!content) return;

    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 401) {
        alert("로그인이 필요합니다.");
        return;
      }
      if (!res.ok) {
        alert(json?.error ?? "전송 실패");
        return;
      }

      setText("");
      await loadLatest(); // ✅ 저장된 DB 기준으로 다시 로드
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadLatest();
    const t = setInterval(loadLatest, 12000); // 12초마다
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-3 border border-slate-300 bg-white">
      <div className="border-b border-slate-200 px-3 py-2">
        <div className="text-[13px] font-semibold text-slate-900">💬 실시간 익명채팅</div>
        <div className="mt-0.5 text-[11px] text-slate-500">
          {meUserId ? "로그인 상태에서만 전송 가능" : "로그인하면 채팅을 보낼 수 있어요"}
        </div>
        {netErr ? <div className="mt-1 text-[11px] text-rose-600">⚠ {netErr}</div> : null}
      </div>

      <div className="max-h-[260px] overflow-auto px-3 py-2 space-y-2">
        {loading ? (
          <div className="text-[12px] text-slate-600">불러오는 중…</div>
        ) : msgsAsc.length === 0 ? (
          <div className="text-[12px] text-slate-600">아직 메시지가 없습니다.</div>
        ) : (
          msgsAsc.map((m, idx) => {
            // ✅ 핵심: "내 메시지" 판별은 user_id로만
            const isMine = !!meUserId && !!m.user_id && String(m.user_id) === String(meUserId);

            return (
              <div key={`${m.id}-${idx}`} className={"flex " + (isMine ? "justify-end" : "justify-start")}>
                <div
                  className={
                    "max-w-[85%] border px-2.5 py-2 text-[12px] leading-relaxed " +
                    (isMine ? "border-sky-300 bg-sky-50 text-slate-900" : "border-slate-200 bg-white text-slate-900")
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">{m.anon_id ?? "익명"}</span>
                    <span className="text-[10px] text-slate-400">{fmtTime(m.created_at)}</span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.content}</div>
                </div>
              </div>
            );
          })
        )}

        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={busy}
            className="w-full border border-slate-300 bg-white py-2 text-[12px] text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            이전 내용 보기
          </button>
        ) : null}
      </div>

      <div className="border-t border-slate-200 px-3 py-2">
        <div className="flex items-stretch gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!meUserId || busy}
            placeholder={meUserId ? "메시지 입력…" : "로그인 후 사용 가능"}
            className="w-full border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none disabled:bg-slate-50"
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            type="button"
            onClick={send}
            disabled={!meUserId || busy || text.trim().length === 0}
            className="border border-sky-700 bg-sky-700 px-3 text-[12px] font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
