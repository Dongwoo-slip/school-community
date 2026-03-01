"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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
    if (password.length < 4) return setMsg("비밀번호는 6글자 이상");

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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Abstract Background Blobs */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-sky-500/10 blur-[120px]" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />

      <main className="glass w-full max-w-[440px] rounded-[2.5rem] p-8 sm:p-12 relative z-10">
        <div className="mb-10 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500 text-3xl shadow-lg shadow-sky-500/20 mb-6">
            🟦
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Welcome Back</h1>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Square Community</p>
        </div>

        <div className="grid gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
            <input
              className="w-full rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
              placeholder="아이디를 입력하세요"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
            <input
              className="w-full rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            className="btn-primary w-full py-4 text-sm mt-4"
            onClick={onLogin}
            disabled={loading}
          >
            {loading ? "AUTHENTICATING..." : "LOG IN"}
          </button>

          {msg && (
            <div className="mt-2 text-center text-xs font-bold text-rose-400 animate-pulse">
              {msg}
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-6">
            <Link href="/signup" className="text-xs font-black text-sky-400 hover:text-sky-300 uppercase tracking-widest transition-colors">
              Create Account
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <Link href="/community/free" className="text-xs font-black text-slate-500 hover:text-slate-400 uppercase tracking-widest transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
