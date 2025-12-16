"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Me = { userId: string | null; role: string; username: string | null };

type PollDraft = {
  enabled: boolean;
  question: string;
  options: { key: string; text: string }[];
};

function newKey() {
  return crypto.randomUUID();
}

export default function NewFreePostPage() {
  const router = useRouter();

  const [me, setMe] = useState<Me>({ userId: null, role: "guest", username: null });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 기존 사진 기능(URL 방식 유지)
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // ✅ 투표
  const [poll, setPoll] = useState<PollDraft>({
    enabled: false,
    question: "투표",
    options: [
      { key: newKey(), text: "" },
      { key: newKey(), text: "" },
    ],
  });

  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadMe() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setMe({ userId: json.userId ?? null, role: json.role ?? "guest", username: json.username ?? null });
  }

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    if (me.userId === null) return;
    if (!me.userId) router.push("/login?next=/community/free/new");
  }, [me.userId, router]);

  const canSubmit = useMemo(() => {
    if (!me.userId) return false;
    if (title.trim().length < 4) return false;
    if (content.trim().length < 4) return false;

    if (poll.enabled) {
      const opts = poll.options.map((o) => o.text.trim()).filter(Boolean);
      if (opts.length < 2) return false;
      if (opts.some((t) => t.length > 30)) return false;
      if (poll.question.trim().length > 50) return false;
    }

    return true;
  }, [me.userId, title, content, poll]);

  function addImageUrl() {
    setImageUrls((prev) => [...prev, ""]);
  }
  function removeImageUrl(i: number) {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addOption() {
    setPoll((p) => {
      if (p.options.length >= 10) return p;
      return { ...p, options: [...p.options, { key: newKey(), text: "" }] };
    });
  }
  function removeOption(key: string) {
    setPoll((p) => {
      if (p.options.length <= 2) return p;
      return { ...p, options: p.options.filter((o) => o.key !== key) };
    });
  }

  async function onSubmit() {
    setMsg(null);
    if (!canSubmit) return;

    setBusy(true);
    try {
      const cleanImages = imageUrls.map((u) => u.trim()).filter(Boolean);

      const payload: any = {
        board: "free",
        title: title.trim(),
        content: content.trim(),
        image_urls: cleanImages,
      };

      if (poll.enabled) {
        const options = poll.options.map((o) => o.text.trim()).filter(Boolean);
        payload.poll = {
          question: poll.question.trim() || "투표",
          options, // 서버에서 id 붙여서 저장
        };
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json?.error ?? "등록 실패");
        return;
      }

      const id = json?.id;
      if (id) router.push(`/community/free/${encodeURIComponent(id)}`);
      else router.push("/community/free");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 text-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <button className="text-sm text-slate-600 hover:underline" onClick={() => router.push("/community/free")}>
          ← 목록
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-extrabold">글쓰기</h1>

        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
            placeholder="제목(4글자 이상)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="min-h-[180px] w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
            placeholder="본문(4글자 이상)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* 이미지 URL (기존 방식 유지) */}
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <div className="font-bold">사진(URL)</div>
              <button
                type="button"
                onClick={addImageUrl}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                + 추가
              </button>
            </div>

            <div className="mt-2 space-y-2">
              {imageUrls.length === 0 ? (
                <div className="text-sm text-slate-500">첨부할 이미지 URL이 있으면 +추가</div>
              ) : (
                imageUrls.map((u, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-sm"
                      placeholder="https://..."
                      value={u}
                      onChange={(e) => {
                        const v = e.target.value;
                        setImageUrls((prev) => prev.map((x, idx) => (idx === i ? v : x)));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImageUrl(i)}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      삭제
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ✅ 투표 */}
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-bold">
                <input
                  type="checkbox"
                  checked={poll.enabled}
                  onChange={(e) => setPoll((p) => ({ ...p, enabled: e.target.checked }))}
                />
                투표 추가
              </label>
            </div>

            {poll.enabled && (
              <div className="mt-3 space-y-2">
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
                  value={poll.question}
                  onChange={(e) => setPoll((p) => ({ ...p, question: e.target.value }))}
                  placeholder="투표 제목(예: 점심 뭐 먹을래?)"
                />

                <div className="space-y-2">
                  {poll.options.map((o, idx) => (
                    <div key={o.key} className="flex gap-2">
                      <input
                        className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-sm"
                        value={o.text}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPoll((p) => ({
                            ...p,
                            options: p.options.map((x) => (x.key === o.key ? { ...x, text: v } : x)),
                          }));
                        }}
                        placeholder={`항목 ${idx + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(o.key)}
                        className="rounded-lg border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50"
                        disabled={poll.options.length <= 2}
                      >
                        -
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-slate-500">최소 2개 / 최대 10개 (항목명 30자 이하)</div>
                  <button
                    type="button"
                    onClick={addOption}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                    disabled={poll.options.length >= 10}
                  >
                    + 항목 추가
                  </button>
                </div>
              </div>
            )}
          </div>

          {msg && <div className="text-sm text-rose-600">{msg}</div>}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canSubmit || busy}
              onClick={onSubmit}
              className="rounded-xl bg-sky-600 px-5 py-2.5 font-bold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {busy ? "등록 중..." : "등록"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
