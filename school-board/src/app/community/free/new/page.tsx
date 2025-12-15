"use client";

import { useState } from "react";

export default function NewPostPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");

  async function submit() {
    if (!title || !content || !password) {
      alert("제목/내용/비밀번호를 모두 입력해줘");
      return;
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board: "free", title, content, password }),
    });

    const json = await res.json();
    if (!res.ok) {
      alert("저장 실패: " + (json.error ?? "error"));
      return;
    }

    // 상세 페이지는 아직 없으면 404가 날 수 있어도 저장은 됨
    location.href = `/community/free/${json.id}`;
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-3">
      <a className="text-sm underline" href="/community/free">
        ← 목록
      </a>

      <h1 className="text-2xl font-bold">글쓰기</h1>

      <input
        className="w-full rounded border p-2"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="w-full rounded border p-2 h-60"
        placeholder="내용"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <input
        className="w-full rounded border p-2"
        placeholder="삭제/수정 비밀번호(필수)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="rounded bg-black px-3 py-2 text-white" onClick={submit}>
        등록
      </button>
    </main>
  );
}
