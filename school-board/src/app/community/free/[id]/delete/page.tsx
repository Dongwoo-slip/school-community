"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

export default function DeletePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [password, setPassword] = useState("");

  async function del() {
    if (!id) {
      alert("글 ID를 못 불러왔어. 새로고침해봐.");
      return;
    }
    if (password.trim().length < 4) {
      alert("비밀번호는 4글자 이상이어야 해");
      return;
    }

    const res = await fetch(`/api/posts/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 403) return alert("비밀번호가 틀렸어");
      return alert("삭제 실패: " + (json.error ?? "error"));
    }

    alert("삭제 완료");
    location.href = "/community/free";
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-3">
      <a className="text-sm underline" href={id ? `/community/free/${id}` : "/community/free"}>
        ← 글로 돌아가기
      </a>

      <h1 className="text-xl font-bold">글 삭제</h1>

      <input className="w-full rounded border p-2" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />

      <button className="rounded bg-black px-3 py-2 text-white" onClick={del}>
        삭제
      </button>
    </main>
  );
}
