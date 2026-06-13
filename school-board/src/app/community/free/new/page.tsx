"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFreeBoard } from "../layout";

type PollDraft = { enabled: boolean; question: string; options: string[] };

function keyOfFile(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

export default function NewFreePostPage() {
  const router = useRouter();
  const { me, loading: boardLoading, refreshAll } = useFreeBoard();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [poll, setPoll] = useState<PollDraft>({
    enabled: false,
    question: "투표",
    options: ["", ""],
  });

  const isVerifiedWriter = me.role === "admin" || me.studentVerified;
  const canWrite = Boolean(me.userId && isVerifiedWriter);

  const canSubmit = useMemo(() => {
    if (!canWrite) return false;
    if (title.trim().length < 2) return false;
    if (content.trim().length < 2) return false;

    if (poll.enabled) {
      const opts = poll.options.map((s) => s.trim()).filter(Boolean);
      if (opts.length < 2) return false;
    }
    return true;
  }, [title, content, poll, canWrite]);

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

      await refreshAll();
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
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* Header Section */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-normal" style={{ color: "var(--text-primary)" }}>새 글 작성</h2>
          <p className="mt-1 text-xs font-medium" style={{ color: "var(--text-muted)" }}>자유게시판에 올릴 내용을 작성하세요.</p>
        </div>
        <button
          className="btn-secondary px-3.5 py-2 text-xs"
          onClick={() => router.push("/community/free")}
          type="button"
        >
          목록
        </button>
      </div>

      {boardLoading ? (
        <div className="glass overflow-hidden p-8 text-center">
          <div className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>계정 상태를 확인하는 중입니다...</div>
        </div>
      ) : !canWrite ? (
        <div className="glass overflow-hidden p-8 text-center">
          <div className="mx-auto max-w-md rounded-lg border border-sky-100 bg-sky-50 p-5">
            <div className="text-base font-semibold text-slate-950">
              {me.userId ? "개별인증이 필요합니다" : "로그인이 필요합니다"}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {me.userId
                ? "게시글 작성은 개별인증을 완료한 계정만 가능해요. 마이페이지에서 인증코드를 등록해 주세요."
                : "게시글을 작성하려면 먼저 로그인해 주세요. 로그인 후 개별인증을 완료하면 글을 작성할 수 있어요."}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              {me.userId ? (
                <button
                  type="button"
                  className="btn-primary py-2 px-4 text-sm"
                  onClick={() => router.push("/community/free/me")}
                >
                  인증하러 가기
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary py-2 px-4 text-sm"
                  onClick={() => router.push("/login?next=/community/free/new")}
                >
                  로그인하기
                </button>
              )}
              <button
                type="button"
                className="btn-secondary py-2 px-4 text-sm"
                onClick={() => router.push("/community/free")}
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div className="glass overflow-hidden p-4 sm:p-5">
        <div className="space-y-5">
          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="ml-0.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>제목</label>
            <input
              className="w-full rounded-md border px-3.5 py-2.5 text-sm font-medium outline-none transition-all"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content Textarea */}
          <div className="space-y-1.5">
            <label className="ml-0.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>본문</label>
            <textarea
              className="w-full min-h-[260px] resize-none rounded-md border px-3.5 py-3 text-sm font-normal leading-6 outline-none transition-all"
              placeholder="내용을 입력하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* File Upload Section */}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">사진 첨부</div>
                  <div className="mt-0.5 text-[11px] font-medium text-slate-500">이미지는 여러 장 선택할 수 있어요.</div>
                </div>
                {files.length > 0 && (
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
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
                <div className="flex min-h-[92px] flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white px-3 py-5 transition-all group-hover/upload:border-sky-300 group-hover/upload:bg-sky-50/40">
                  <span className="text-xs font-semibold text-slate-700">파일 선택</span>
                  <span className="mt-1 text-[11px] text-slate-500">JPG, PNG 등 이미지 파일</span>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="mb-2 text-[11px] font-semibold text-slate-500">
                    선택된 파일 ({files.length})
                  </div>
                  <ul className="grid grid-cols-1 gap-2">
                    {files.map((f) => (
                      <li
                        key={keyOfFile(f)}
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-[11px] font-medium text-slate-600">{f.name}</span>
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
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
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">투표</div>
                  <div className="mt-0.5 text-[11px] font-medium text-slate-500">선택형 질문을 함께 올릴 수 있어요.</div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={poll.enabled}
                    onChange={(e) => setPoll((p) => ({ ...p, enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="h-5 w-9 rounded-full bg-slate-300 transition-all after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:bg-sky-500 peer-checked:after:translate-x-4"></div>
                </label>
              </div>

              {poll.enabled ? (
                <div className="mt-3 space-y-3">
                  <input
                    className="w-full rounded-md border bg-white px-3 py-2.5 text-sm font-medium outline-none transition-all"
                    placeholder="투표 질문"
                    value={poll.question}
                    onChange={(e) => setPoll((p) => ({ ...p, question: e.target.value }))}
                  />

                  <div className="space-y-2">
                    {poll.options.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 group/poll">
                        <input
                          className="flex-1 rounded-md border bg-white px-3 py-2 text-xs font-medium outline-none transition-all"
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
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                            onClick={() => removeOption(i)}
                            type="button"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    className="w-full rounded-md border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100"
                    onClick={addOption}
                    type="button"
                  >
                    항목 추가
                  </button>
                </div>
              ) : (
                <div className="flex min-h-[144px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-white text-[11px] font-medium text-slate-500">
                  투표를 사용하지 않습니다
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              disabled={!canSubmit || uploading}
              onClick={onSubmit}
              className="btn-primary order-1 px-6 py-2.5 text-sm sm:order-2"
              type="button"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span>게시글을 올리는 중...</span>
                </div>
              ) : "등록하기"}
            </button>
            <button
              className="btn-secondary order-2 px-5 py-2.5 text-sm sm:order-1"
              onClick={() => router.push("/community/free")}
              type="button"
            >
              취소
            </button>
          </div>
        </div>
      </div>
      )}
    </main>
  );
}
