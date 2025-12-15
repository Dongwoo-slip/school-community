"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function toEmail(username: string) {
  return `${username.trim().toLowerCase()}@school-board.test`;
}

export default function LoginPage() {
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setMsg(null);

    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) {
      return setMsg("아이디는 영문/숫자/_ 만 가능 (3~20자)");
    }
    if (password.length < 4) return setMsg("비밀번호는 4글자 이상");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: toEmail(u),
        password,
      });

      if (error) return setMsg("아이디 또는 비밀번호가 올바르지 않습니다.");

      const params = new URLSearchParams(location.search);
      const next = params.get("next") ?? "/community/free";
      location.href = next;
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-3">
      <h1 className="text-2xl font-bold">로그인</h1>

      <input
        className="w-full rounded border p-2"
        placeholder="아이디"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        className="w-full rounded border p-2"
        placeholder="비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        className="w-full rounded bg-black p-2 text-white disabled:opacity-60"
        onClick={onLogin}
        disabled={loading}
      >
        {loading ? "로그인 중..." : "로그인"}
      </button>

      <div className="flex gap-2">
        <a className="flex-1 rounded border p-2 text-center" href="/signup">
          회원가입
        </a>
        <a className="flex-1 rounded border p-2 text-center" href="/community/free">
          홈으로
        </a>
      </div>

      {msg && <div className="text-sm text-red-600">{msg}</div>}
    </main>
  );
}
