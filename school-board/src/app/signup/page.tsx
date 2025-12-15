"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function toEmail(username: string) {
  return `${username.trim().toLowerCase()}@school-board.test`;
}

export default function SignUpPage() {
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSignUp() {
    setMsg(null);

    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) {
      return setMsg("아이디는 영문/숫자/_ 만 가능 (3~20자)");
    }
    if (password.length < 6) return setMsg("비밀번호는 6자 이상 권장");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: toEmail(u),
        password,
      });

      if (error) return setMsg("회원가입에 실패했습니다. (이미 사용 중일 수 있어요)");

      // 이메일 확인 OFF면 보통 바로 세션이 잡히거나, 바로 로그인 가능
      location.href = "/community/free";
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-3">
      <h1 className="text-2xl font-bold">회원가입</h1>

      <input
        className="w-full rounded border p-2"
        placeholder="아이디 (영문/숫자/_ , 3~20자)"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        className="w-full rounded border p-2"
        placeholder="비밀번호 (6자 이상 권장)"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        className="w-full rounded bg-black p-2 text-white disabled:opacity-60"
        onClick={onSignUp}
        disabled={loading}
      >
        {loading ? "가입 중..." : "가입"}
      </button>

      <div className="flex gap-2">
        <a className="flex-1 rounded border p-2 text-center" href="/login">
          로그인
        </a>
        <a className="flex-1 rounded border p-2 text-center" href="/community/free">
          홈으로
        </a>
      </div>

      {msg && <div className="text-sm text-red-600">{msg}</div>}
    </main>
  );
}
