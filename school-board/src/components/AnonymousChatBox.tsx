"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type Msg = {
  id: string;
  content: string;
  anon_id: string | null;
  created_at: string;
  user_id: string | null;
};

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isNearBottom(el: HTMLElement, threshold = 160) {
  const remain = el.scrollHeight - el.scrollTop - el.clientHeight;
  return remain < threshold;
}

export default function AnonymousChatBox({ meUserId }: { meUserId: string | null }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [netErr, setNetErr] = useState<string | null>(null);

  // ✅ 서버는 최신순(desc)로 주니까 그대로 저장
  const [msgsDesc, setMsgsDesc] = useState<Msg[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState("");

  // ✅ 실제 스크롤이 생기는 div
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ✅ “아래에 붙어있기” 상태
  const stickRef = useRef(true);
  const firstRef = useRef(true);

  // ✅ loadMore 시 스크롤 튐 방지
  const restoreRef = useRef<null | { top: number; height: number }>(null);

  // 화면 표시용: 오래된→최신(asc)
  const msgsAsc = useMemo(() => [...msgsDesc].reverse(), [msgsDesc]);
  const oldestCreatedAt = msgsAsc[0]?.created_at ?? null;

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    // sentinel이 가장 안정적
    bottomRef.current?.scrollIntoView({ block: "end", behavior });
    // fallback
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  async function loadLatest() {
    const el = scrollerRef.current;
    if (el) stickRef.current = isNearBottom(el);

    try {
      const res = await fetch(`/api/chat?limit=25`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setNetErr(json?.error ?? `불러오기 실패 (${res.status})`);
        return;
      }

      setNetErr(null);

      const data = Array.isArray(json.data) ? (json.data as Msg[]) : [];
      // ✅ 서버가 desc로 이미 정렬해서 줌
      setMsgsDesc(data);
      setHasMore(!!json.hasMore);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!oldestCreatedAt || busy) return;

    const el = scrollerRef.current;
    if (el) restoreRef.current = { top: el.scrollTop, height: el.scrollHeight };

    setBusy(true);
    try {
      const res = await fetch(
        `/api/chat?limit=25&before=${encodeURIComponent(oldestCreatedAt)}`,
        { cache: "no-store", credentials: "include" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;

      const more = Array.isArray(json.data) ? (json.data as Msg[]) : [];
      // more 도 desc로 옴 (더 과거)
      setMsgsDesc((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const merged = [...prev, ...more.filter((m) => !seen.has(m.id))];
        return merged;
      });
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
      stickRef.current = true; // ✅ 전송 후엔 무조건 최신으로 붙기
      await loadLatest();
    } finally {
      setBusy(false);
    }
  }

  // ✅ 메시지 변화 이후 스크롤 처리(타이밍 문제 해결: useLayoutEffect)
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    // (1) loadMore 후 위치 복원
    if (restoreRef.current) {
      const snap = restoreRef.current;
      const newH = el.scrollHeight;
      el.scrollTop = snap.top + (newH - snap.height);
      restoreRef.current = null;
      return;
    }

    // (2) 첫 로드: 무조건 아래(최신)
    if (firstRef.current) {
      firstRef.current = false;
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom("auto")));
      return;
    }

    // (3) 사용자가 아래 보고 있었으면 계속 최신 유지
    if (stickRef.current) {
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom("auto")));
    }
  }, [msgsDesc.length]);

  useEffect(() => {
    loadLatest();
    const t = setInterval(loadLatest, 12000);
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

      {/* ✅ 여기서 가로 스크롤 “근본 차단” */}
      <div
        ref={scrollerRef}
        className="h-[260px] px-3 py-2"
        style={{ overflowY: "auto", overflowX: "hidden" }}
        onScroll={() => {
          const el = scrollerRef.current;
          if (!el) return;
          stickRef.current = isNearBottom(el);
        }}
      >
        {/* ✅ flex 라인/버블이 줄어들 수 있게 min-w-0 필수 */}
        <div className="min-w-0 space-y-2">
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

          {loading ? (
            <div className="text-[12px] text-slate-600">불러오는 중…</div>
          ) : msgsAsc.length === 0 ? (
            <div className="text-[12px] text-slate-600">아직 메시지가 없습니다.</div>
          ) : (
            msgsAsc.map((m) => {
              const isMine = !!meUserId && !!m.user_id && String(m.user_id) === String(meUserId);

              return (
                <div key={m.id} className={"flex min-w-0 " + (isMine ? "justify-end" : "justify-start")}>
                  <div
                    className={
                      "min-w-0 border px-2.5 py-2 text-[12px] leading-relaxed " +
                      (isMine ? "border-sky-300 bg-sky-50 text-slate-900" : "border-slate-200 bg-white text-slate-900")
                    }
                    style={{ maxWidth: "85%", minWidth: 0 }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-slate-700">{m.anon_id ?? "익명"}</span>
                      <span className="text-[10px] text-slate-400" suppressHydrationWarning>
                        {fmtTime(m.created_at)}
                      </span>
                    </div>

                    {/* ✅ “진짜 줄바꿈”은 여기서 강제 */}
                    <div
                      className="mt-1 min-w-0"
                      style={{
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        wordBreak: "break-all", // 공백 없는 연속문자도 무조건 감김
                        maxWidth: "100%",
                      }}
                    >
                      
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* 맨 아래 기준점 */}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-slate-200 px-3 py-2">
        <div className="flex items-stretch gap-2 min-w-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!meUserId || busy}
            placeholder={meUserId ? "메시지 입력… (Enter 전송 / Shift+Enter 줄바꿈)" : "로그인 후 사용 가능"}
            className="w-full min-w-0 border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none disabled:bg-slate-50 resize-none overflow-y-auto"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
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
