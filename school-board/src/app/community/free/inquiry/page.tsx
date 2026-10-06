"use client";

import Link from "next/link";
import { useState } from "react";
import { useFreeBoard } from "../layout";

export default function InquiryPage() {
  const { me } = useFreeBoard();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function sendInquiry() {
    setMsg(null);

    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (cleanTitle.length < 2) return setMsg("제목을 2글자 이상 입력해 주세요.");
    if (cleanContent.length < 5) return setMsg("문의 내용을 5글자 이상 입력해 주세요.");

    setBusy(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cleanTitle, content: cleanContent }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json?.error ?? "문의 전송에 실패했습니다.");
        return;
      }
      setTitle("");
      setContent("");
      setSent(true);
      setMsg("문의가 관리자에게 전송됐습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/community/free" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
          메인
        </Link>
        <Link href="/community/free/me" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
          내 정보
        </Link>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <h1 className="text-lg font-semibold text-slate-950">관리자에게 문의하기</h1>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            계정, 인증, 게시글, 이용 중 불편한 점을 관리자에게 보낼 수 있습니다.
          </p>
        </div>

        {!me.userId ? (
          <div className="space-y-3 bg-slate-50 px-4 py-6 sm:px-5">
            <p className="text-sm font-medium text-slate-700">로그인 후 문의를 보낼 수 있습니다.</p>
            <Link
              href="/login?next=/community/free/inquiry"
              className="inline-flex rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
            >
              로그인하기
            </Link>
          </div>
        ) : sent ? (
          <div className="space-y-4 bg-slate-50 px-4 py-6 sm:px-5">
            <div className="rounded-lg border border-emerald-100 bg-white p-4 text-sm font-medium text-emerald-700">
              {msg}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setMsg(null);
                }}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                새 문의 작성
              </button>
              <Link
                href="/community/free/messages"
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                쪽지함 보기
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4 bg-slate-50 px-4 py-5 sm:px-5">
            <div>
              <label className="text-xs font-semibold text-slate-700">제목</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={busy}
                maxLength={120}
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="예: 인증 관련 문의"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">문의 내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={busy}
                maxLength={2000}
                className="mt-1.5 min-h-[180px] w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="문의할 내용을 적어 주세요."
              />
              <div className="mt-1 text-right text-[11px] font-medium text-slate-400">{content.length}/2000</div>
            </div>

            <div className="flex items-center justify-between gap-3">
              {msg ? <p className="text-sm font-medium text-rose-600">{msg}</p> : <div />}
              <button
                type="button"
                onClick={sendInquiry}
                disabled={busy || title.trim().length < 2 || content.trim().length < 5}
                className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "전송 중..." : "문의 보내기"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
