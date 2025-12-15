"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Me = { userId: string | null; role: string; username: string | null };

export default function DeletePostPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [me, setMe] = useState<Me>({ userId: null, role: "guest", username: null });
  const [post, setPost] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;

    (async () => {
      // 1) 로그인 정보
      const meRes = await fetch("/api/me", { cache: "no-store" });
      const meJson = await meRes.json().catch(() => ({}));
      setMe({
        userId: meJson.userId ?? null,
        role: meJson.role ?? "guest",
        username: meJson.username ?? null,
      });

      // 2) 글 정보 (작성자 확인용)
      const postRes = await fetch(`/api/posts/${encodeURIComponent(id)}`, { cache: "no-store" });
      const postJson = await postRes.json().catch(() => ({}));
      if (!postRes.ok) {
        setErr(postJson?.error ?? "글 정보를 불러오지 못했습니다.");
        return;
      }
      setPost(postJson.data);
    })();
  }, [id]);

  const canDelete =
    !!me.userId && !!post && (me.role === "admin" || post.author_id === me.userId);

  async function onDelete() {
    if (!id) return;
    setErr("");
    setBusy(true);

    const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setErr(json?.error ?? "삭제 실패");
      return;
    }

    router.replace("/community/free");
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <a className="text-sm underline" href={`/community/free/${encodeURIComponent(id ?? "")}`}>
        ← 글로 돌아가기
      </a>

      <h1 className="text-2xl font-bold text-red-600">게시글 삭제</h1>

      {!me.userId ? (
        <div className="rounded border p-4">
          <div className="text-gray-700">삭제하려면 로그인이 필요합니다.</div>
          <a className="mt-3 inline-block rounded bg-black px-3 py-2 text-white" href={`/login?next=/community/free/${encodeURIComponent(id ?? "")}/delete`}>
            로그인하기
          </a>
        </div>
      ) : !post ? (
        <div className="text-gray-600">불러오는 중…</div>
      ) : !canDelete ? (
        <div className="rounded border p-4 text-gray-700">
          <div className="font-semibold">삭제 권한이 없습니다.</div>
          <div className="mt-1 text-sm text-gray-500">작성자 본인 또는 관리자만 삭제할 수 있어요.</div>
        </div>
      ) : (
        <div className="rounded border p-4">
          <div className="text-gray-700">
            정말 삭제할까요? <span className="font-semibold">되돌릴 수 없습니다.</span>
          </div>

          {err && <div className="mt-3 rounded border p-3 text-red-600">{err}</div>}

          <div className="mt-4 flex gap-2">
            <button
              disabled={busy}
              onClick={onDelete}
              className="rounded bg-red-600 px-3 py-2 text-white disabled:opacity-60"
            >
              {busy ? "삭제 중…" : "삭제"}
            </button>
            <a className="rounded border px-3 py-2" href={`/community/free/${encodeURIComponent(id ?? "")}`}>
              취소
            </a>
          </div>
        </div>
      )}

      {err && !post && <div className="rounded border p-4 text-red-600">{err}</div>}
    </main>
  );
}
