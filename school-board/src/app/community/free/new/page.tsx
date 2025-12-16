"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewFreePostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [meUserId, setMeUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      setMeUserId(json.userId ?? null);
    })();
  }, []);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    setFiles(list);
  }

  async function onSubmit() {
    if (!meUserId) {
      router.push("/login?next=/community/free/new");
      return;
    }

    const t = title.trim();
    const c = content.trim();
    if (t.length < 4) return alert("제목은 4글자 이상");
    if (c.length < 4) return alert("본문은 4글자 이상");

    setBusy(true);
    try {
      const form = new FormData();
      form.append("board", "free");
      form.append("title", t);
      form.append("content", c);
      // images (multiple)
      files.forEach((f) => form.append("images", f));

      const res = await fetch("/api/posts", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(json?.error ?? "글 작성 실패");
        return;
      }

      router.push(`/community/free/${encodeURIComponent(json.id)}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-6">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/community/free" className="text-sm text-slate-200 hover:underline">
          ← 목록
        </Link>
      </div>

      <section className="rounded-xl border border-slate-700/70 bg-slate-900/30 p-4 sm:p-6">
        <h1 className="text-xl font-bold text-slate-100">글쓰기</h1>

        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/30 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="본문"
            rows={10}
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950/30 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />

          <div className="rounded-xl border border-slate-700/70 bg-slate-900/20 p-3">
            <div className="text-sm font-semibold text-slate-100">사진 첨부</div>
            <div className="mt-2 flex flex-col gap-2">
              <input type="file" accept="image/*" multiple onChange={onPickFiles} />
              {files.length > 0 ? (
                <div className="text-xs text-slate-300">
                  선택됨: {files.map((f) => f.name).join(", ")}
                </div>
              ) : (
                <div className="text-xs text-slate-500">이미지를 여러 장 선택할 수 있어요.</div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href="/community/free"
              className="rounded-lg border border-slate-700 bg-slate-900/30 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900/50"
            >
              취소
            </Link>
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              등록
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
