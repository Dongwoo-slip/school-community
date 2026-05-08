"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFreeBoard } from "../../layout";

export default function EditFreePostPage() {
  const router = useRouter();
  const params = useParams();
  const raw = (params as any)?.id as string | string[] | undefined;
  const id = Array.isArray(raw) ? raw[0] : raw;
  const { me, refreshAll } = useFreeBoard();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canSave = useMemo(() => title.trim().length >= 2 && content.trim().length >= 2 && !saving, [title, content, saving]);
  const canEdit = !!me.userId && !!authorId && (me.role === "admin" || String(me.userId) === String(authorId));

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, { cache: "no-store", credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(json?.error ?? "게시글을 불러오지 못했습니다.");
          return;
        }
        const p = json?.data ?? {};
        setTitle(String(p.title ?? ""));
        setContent(String(p.content ?? ""));
        setAuthorId(p.author_id ?? null);
        setErr(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function save() {
    if (!id || !canSave || !canEdit) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error ?? "수정 실패");
        return;
      }
      await refreshAll();
      router.push(`/community/free/${encodeURIComponent(id)}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="glass p-8 text-sm text-slate-500">불러오는 중...</div>;

  if (err) {
    return (
      <div className="glass p-8">
        <div className="text-sm font-bold text-rose-400">{err}</div>
        <button type="button" className="btn-secondary mt-4 px-4 py-2 text-xs" onClick={() => router.back()}>
          돌아가기
        </button>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="glass p-8">
        <div className="text-sm font-bold text-slate-300">작성자 본인 또는 관리자만 수정할 수 있습니다.</div>
        <button type="button" className="btn-secondary mt-4 px-4 py-2 text-xs" onClick={() => router.back()}>
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">게시글 수정</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">수정 전/후 내용은 관리자 로그에 저장됩니다.</p>
        </div>
        <button type="button" className="btn-secondary px-4 py-2 text-xs" onClick={() => router.back()}>
          취소
        </button>
      </div>

      <div className="glass p-6 sm:p-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-sky-400">제목</label>
            <input
              className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-base font-bold text-white placeholder:text-slate-600 outline-none focus:bg-white/10 focus:ring-2 focus:ring-sky-500/30"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-sky-400">본문</label>
            <textarea
              className="min-h-[360px] w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-4 text-[15px] font-medium leading-relaxed text-slate-200 placeholder:text-slate-600 outline-none transition-all focus:bg-white/10 focus:ring-2 focus:ring-sky-500/30"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={5000}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-bold text-slate-500">
              제목 {title.trim().length}/120 · 본문 {content.trim().length}/5000
            </div>
            <button type="button" className="btn-primary px-6 py-3 text-sm" onClick={save} disabled={!canSave}>
              {saving ? "저장 중..." : "수정 저장"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
