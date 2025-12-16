"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function toEmail(username: string) {
  return `${username.trim().toLowerCase()}@school-board.test`;
}

export default function SignupPage() {
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSignup() {
    setMsg(null);

    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return setMsg("아이디는 영문/숫자/_ 만 가능 (3~20자)");
    if (password.length < 4) return setMsg("비밀번호는 4글자 이상");
    if (password !== password2) return setMsg("비밀번호가 일치하지 않습니다.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: toEmail(u),
        password,
      });

      if (error) return setMsg(error.message);

      // 가입 후 바로 로그인되게(대부분 자동 세션 생성됨)
      const params = new URLSearchParams(location.search);
      const next = params.get("next") ?? "/community/free";
      location.href = next;
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 text-slate-900">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold">회원가입</h1>
        <p className="mt-1 text-sm text-slate-600">아이디/비밀번호로 가입합니다.</p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">아이디</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
              placeholder="영문/숫자/_ (3~20자)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">비밀번호</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
              placeholder="4글자 이상"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">비밀번호 확인</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
              placeholder="한 번 더 입력"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            className="mt-2 w-full rounded-lg bg-sky-600 p-2.5 font-bold text-white hover:bg-sky-500 disabled:opacity-60"
            onClick={onSignup}
            disabled={loading}
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>

          <div className="flex gap-2 pt-1">
            <a className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-center text-sm hover:bg-slate-50" href="/login">
              로그인
            </a>
            <a className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-center text-sm hover:bg-slate-50" href="/community/free">
              홈으로
            </a>
          </div>

          {msg && <div className="text-sm text-rose-600">{msg}</div>}
        </div>
      </div>
    </main>
  );
}
