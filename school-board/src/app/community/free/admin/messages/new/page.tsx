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
    if (!t) return alert("받는 사람 아이디를 입력하세요.");
    if (!c) return alert("내용을 입력하세요.");

    setBusy(true);
    setMsg(null);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(t);
      const res = await fetch("/api/messages/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(isUuid ? { receiver_id: t } : { to: t }), content: c }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json?.error ?? "전송 실패");
        return;
      }
      setContent("");
      setMsg("전송 완료");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href="/community/free" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
          메인
        </Link>
        <div className="text-sm font-semibold text-slate-900">관리자 쪽지 보내기</div>
      </div>

      {!can ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700">관리자만 접근 가능합니다.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4">
            <h2 className="text-base font-semibold text-slate-950">쪽지 작성</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">관리자 계정에서 아이디로 안내 쪽지를 보냅니다.</p>
          </div>

          <div className="space-y-3 bg-slate-50 px-4 py-4">
          <div className="text-[12px] font-semibold text-slate-700">받는 사람 아이디</div>
          <input
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none"
            placeholder="예: student01 또는 user UUID"
          />

          <div className="text-[12px] font-semibold text-slate-700">내용</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[140px] w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5 outline-none"
            placeholder="쪽지 내용"
          />

          <div className="flex items-center justify-between gap-3">
            {msg ? <div className="text-[12px] font-medium text-slate-700">{msg}</div> : <div />}
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="btn-primary px-4 py-2 text-[12px] disabled:opacity-60"
            >
              {busy ? "전송 중..." : "전송"}
            </button>
          </div>

          </div>
        </div>
      )}
    </main>
  );
}
