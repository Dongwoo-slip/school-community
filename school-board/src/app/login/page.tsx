"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

function toEmail(username: string) {
  return `${username.trim().toLowerCase()}@school-board.test`;
}

const FIELD_STYLE = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: 8,
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
} as const;

export default function LoginPage() {
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setMsg(null);
    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return setMsg("아이디는 영문/숫자/_ 만 가능 (3~20자)");
    if (password.length < 4) return setMsg("비밀번호는 4글자 이상");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: toEmail(u), password });
      if (error) return setMsg("아이디 또는 비밀번호가 올바르지 않습니다.");
      const params = new URLSearchParams(location.search);
      location.href = params.get("next") ?? "/community/free";
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, background: 'var(--brand)', borderRadius: 12, fontSize: '1rem', fontWeight: 900, color: 'white', marginBottom: '0.75rem' }}>SQ</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Square 로그인</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>청주고등학교 커뮤니티</p>
        </div>

        {/* Form card */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>아이디</label>
            <input
              style={FIELD_STYLE}
              placeholder="아이디를 입력하세요"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onLogin()}
              autoComplete="username"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>비밀번호</label>
            <input
              style={FIELD_STYLE}
              placeholder="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onLogin()}
              autoComplete="current-password"
            />
          </div>

          {msg && (
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-red)', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 8, padding: '0.6rem 0.8rem' }}>
              {msg}
            </div>
          )}

          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.9rem', marginTop: '0.25rem' }}
            onClick={onLogin}
            disabled={loading}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </div>

        {/* Links */}
        <div style={{ textAlign: 'center', marginTop: '1.25rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
          <Link href="/signup" style={{ fontSize: '0.78rem', color: 'var(--brand-light)', fontWeight: 600 }}>회원가입</Link>
          <Link href="/community/free" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>홈으로</Link>
        </div>
      </div>
    </div>
  );
}
