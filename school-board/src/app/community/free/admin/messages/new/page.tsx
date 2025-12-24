"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function AdminNewMessagePage() {
  const [me, setMe] = useState<{ userId: string | null; role: string; username: string | null }>({
    userId: null,
    role: "guest",
    username: null,
  });

  const [toUserId, setToUserId] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      setMe({ userId: json.userId ?? null, role: json.role ?? "guest", username: json.username ?? null });
    })();
  }, []);

  const can = useMemo(() => me.role === "admin" && !!me.userId, [me.role, me.userId]);

  async function send() {
    if (!can) return alert("관리자만 사용할 수 있어요.");
    const t = toUserId.trim();
    const c = content.trim();
    if (!t) return alert("받는 사람 userId를 입력하세요.");
    if (!c) return alert("내용을 입력하세요.");

    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: t, content: c }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json?.error ?? "전송 실패");
        return;
      }
      setContent("");
      setMsg("✅ 전송 완료! (상대 알림에 뜸)");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href="/community/free" className="text-sm text-slate-700 hover:underline">
          ← 메인
        </Link>
        <div className="text-sm font-semibold text-slate-900">✉ 관리자 쪽지 보내기</div>
      </div>

      {!can ? (
        <div className="border border-slate-300 bg-white p-4 text-sm text-slate-700">관리자만 접근 가능합니다.</div>
      ) : (
        <div className="border border-slate-300 bg-white p-4">
          <div className="text-[12px] font-semibold text-slate-700">받는 사람 userId</div>
          <input
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-[12px] outline-none"
            placeholder="예) 3f5c... (auth.users uuid)"
          />

          <div className="mt-3 text-[12px] font-semibold text-slate-700">내용</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-[12px] outline-none min-h-[140px]"
            placeholder="쪽지 내용"
          />

          <button
            type="button"
            onClick={send}
            disabled={busy}
            className="mt-3 border border-sky-700 bg-sky-700 px-4 py-2 text-[12px] font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            전송
          </button>

          {msg ? <div className="mt-2 text-[12px] text-slate-700">{msg}</div> : null}

          <div className="mt-4 text-[11px] text-slate-500">
            ※ “userId를 어디서 구하냐” → 가장 쉬운 방법은 <b>게시글 상세 페이지에서 author_id를 보이게 하거나</b>, 별도의 “유저 검색” 페이지를 추가하는 방식이야.
            원하면 게시글 상세에 “쪽지 보내기(관리자만)” 버튼까지 바로 붙여줄게.
          </div>
        </div>
      )}
    </main>
  );
}
