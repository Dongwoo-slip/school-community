"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFreeBoard } from "../../layout";

export default function DmCenterClient() {
  const { me } = useFreeBoard();
  const sp = useSearchParams();

  // ?to=username 형태로 미리 채워주기
  const presetTo = useMemo(() => (sp.get("to") ?? "").trim(), [sp]);
  const presetPost = useMemo(() => (sp.get("post") ?? "").trim(), [sp]);

  const [to, setTo] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (presetTo) setTo(presetTo);
  }, [presetTo]);

  async function send() {
    const toTrim = to.trim();
    const msg = content.trim();

    if (!toTrim) return alert("username을 입력하세요.");
    if (!msg) return alert("내용을 입력하세요.");

    setBusy(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        // ✅ 핵심: 반드시 to를 포함해야 함
        body: JSON.stringify({ to: toTrim, content: msg, post: presetPost || null }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error ?? "전송 실패");
        return;
      }

      setContent("");
      alert("전송 완료");
    } finally {
      setBusy(false);
    }
  }

  if (me.role !== "admin") {
    return (
      <div className="border border-slate-300 bg-white p-4 text-[12px] text-slate-700">
        관리자만 접근할 수 있습니다.
        <div className="mt-3">
          <Link href="/community/free" className="text-sky-700 underline underline-offset-2">
            ← 메인으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-300 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[15px] font-extrabold text-slate-900">🛠 관리자 DM 센터</div>
          <div className="mt-0.5 text-[12px] text-slate-600">
            username으로 쪽지를 보냅니다. (예: <span className="font-semibold">ruru123</span>)
          </div>
          {presetPost ? (
            <div className="mt-0.5 text-[11px] text-slate-500">
              참고 게시글: <span className="font-semibold">{presetPost}</span>
            </div>
          ) : null}
        </div>

        <Link
          href="/community/free"
          className="border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
        >
          메인
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <div>
          <div className="mb-1 text-[12px] font-semibold text-slate-700">받는 사람(username)</div>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none"
            placeholder="username 입력"
          />
        </div>

        <div>
          <div className="mb-1 text-[12px] font-semibold text-slate-700">내용</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none"
            rows={7}
            placeholder="쪽지 내용 입력…"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={send}
            disabled={busy}
            className="border border-emerald-700 bg-emerald-700 px-4 py-2 text-[12px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
