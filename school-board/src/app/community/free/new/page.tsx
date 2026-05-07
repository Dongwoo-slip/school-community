"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PollDraft = { enabled: boolean; question: string; options: string[] };

function keyOfFile(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

export default function NewFreePostPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [poll, setPoll] = useState<PollDraft>({
    enabled: false,
    question: "투표",
    options: ["", ""],
  });

  const canSubmit = useMemo(() => {
    if (title.trim().length < 2) return false;
    if (content.trim().length < 2) return false;

    if (poll.enabled) {
      const opts = poll.options.map((s) => s.trim()).filter(Boolean);
      if (opts.length < 2) return false;
    }
    return true;
  }, [title, content, poll]);

  function addFiles(picked: File[]) {
    setFiles((prev) => {
      const map = new Map<string, File>();
      [...prev, ...picked].forEach((f) => map.set(keyOfFile(f), f)); // 중복 제거
      return Array.from(map.values());
    });
  }

  function removeFile(target: File) {
    const k = keyOfFile(target);
    setFiles((prev) => prev.filter((x) => keyOfFile(x) !== k));
  }

  function clearFiles() {
    setFiles([]);
  }

  async function uploadFilesIfAny(): Promise<string[]> {
    if (files.length === 0) return [];

    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "업로드 실패");

    return Array.isArray(json.urls) ? json.urls : [];
  }

  async function onSubmit() {
    if (!canSubmit || uploading) return;

    setUploading(true);
    try {
      const image_urls = await uploadFilesIfAny();

      const body: any = {
        board: "free",
        title: title.trim(),
        content: content.trim(),
        image_urls,
      };

      if (poll.enabled) {
        body.poll = {
          question: poll.question.trim() || "투표",
          options: poll.options.map((s) => s.trim()).filter(Boolean),
        };
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error ?? "등록 실패");
        return;
      }

      router.push(`/community/free/${encodeURIComponent(json.id)}`);
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "등록 실패");
    } finally {
      setUploading(false);
    }
  }

  function addOption() {
    setPoll((p) => ({ ...p, options: [...p.options, ""] }));
  }

  function removeOption(i: number) {
    setPoll((p) => ({ ...p, options: p.options.filter((_, idx) => idx !== i) }));
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Header Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">새로운 이야기 작성</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">당신의 생각을 자유롭게 공유해보세요.</p>
        </div>
        <button
          className="btn-secondary px-6 py-2 text-xs"
          onClick={() => router.push("/community/free")}
          type="button"
        >
          목록으로 돌아가기
        </button>
      </div>

      <div className="glass overflow-hidden rounded-[2.5rem] p-8 sm:p-12">
        <div className="space-y-8">
          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-sky-400 ml-1">제목</label>
            <input
              className="w-full rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-lg font-bold text-white placeholder:text-slate-600 outline-none focus:bg-white/10 focus:ring-2 focus:ring-sky-500/30 transition-all"
              placeholder="게시글의 제목을 입력해주세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content Textarea */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-sky-400 ml-1">본문 내용</label>
            <textarea
              className="w-full min-h-[400px] rounded-3xl border border-white/5 bg-white/5 px-6 py-6 text-base font-medium text-slate-200 placeholder:text-slate-600 outline-none focus:bg-white/10 focus:ring-2 focus:ring-sky-500/30 transition-all resize-none"
              placeholder="나누고 싶은 이야기를 자유롭게 작성해보세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* File Upload Section */}
            <div className="rounded-3xl bg-white/[0.03] p-6 border border-white/5">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🖼️</span>
                  <span className="text-xs font-black text-white uppercase tracking-wider">사진 첨부</span>
                </div>
                {files.length > 0 && (
                  <button
                    type="button"
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors"
                    onClick={clearFiles}
                  >
                    전체 삭제
                  </button>
                )}
              </div>

              <div className="relative group/upload">
                <input
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    addFiles(picked);
                    e.currentTarget.value = "";
                  }}
                />
                <div className="flex flex-col items-center justify-center py-8 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] group-hover/upload:bg-white/[0.05] group-hover/upload:border-sky-500/30 transition-all">
                  <span className="text-2xl mb-2">📤</span>
                  <span className="text-[11px] font-bold text-slate-400">사진 클릭 또는 드래그</span>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-6 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    선택된 파일 ({files.length})
                  </div>
                  <ul className="grid grid-cols-1 gap-2">
                    {files.map((f) => (
                      <li
                        key={keyOfFile(f)}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                      >
                        <span className="min-w-0 truncate text-[11px] font-medium text-slate-300">{f.name}</span>
                        <button
                          type="button"
                          className="text-[10px] font-black text-rose-500/60 hover:text-rose-500 transition-colors"
                          onClick={() => removeFile(f)}
                        >
                          삭제
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Poll Section */}
            <div className="rounded-3xl bg-white/[0.03] p-6 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <span className="text-xs font-black text-white uppercase tracking-wider">투표 기능</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={poll.enabled}
                    onChange={(e) => setPoll((p) => ({ ...p, enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                </label>
              </div>

              {poll.enabled ? (
                <div className="mt-6 space-y-4">
                  <input
                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:bg-white/10 transition-all font-bold"
                    placeholder="무엇에 대해 투표할까요?"
                    value={poll.question}
                    onChange={(e) => setPoll((p) => ({ ...p, question: e.target.value }))}
                  />

                  <div className="space-y-2">
                    {poll.options.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 group/poll">
                        <input
                          className="flex-1 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs font-medium text-slate-300 placeholder:text-slate-600 outline-none focus:bg-white/10 transition-all font-bold"
                          placeholder={`항목 ${i + 1}`}
                          value={v}
                          onChange={(e) =>
                            setPoll((p) => ({
                              ...p,
                              options: p.options.map((x, idx) => idx === i ? e.target.value : x),
                            }))
                          }
                        />
                        {poll.options.length > 2 && (
                          <button
                            className="p-3 text-rose-500/40 hover:text-rose-500 transition-colors"
                            onClick={() => removeOption(i)}
                            type="button"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    className="w-full py-3 rounded-xl border border-white/5 bg-white/[0.02] text-[11px] font-black text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all uppercase tracking-widest"
                    onClick={addOption}
                    type="button"
                  >
                    + 항목 추가
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                  <span className="text-2xl mb-2">💤</span>
                  <span className="text-[10px] font-bold text-slate-500">투표가 비활성화됨</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-8 flex flex-col sm:flex-row gap-4">
            <button
              disabled={!canSubmit || uploading}
              onClick={onSubmit}
              className="flex-1 btn-primary py-4 text-sm font-black shadow-xl shadow-sky-500/20"
              type="button"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span>게시글을 올리는 중...</span>
                </div>
              ) : "이야기 등록하기"}
            </button>
            <button
              className="btn-secondary px-8 py-4 text-sm font-black"
              onClick={() => router.push("/community/free")}
              type="button"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
