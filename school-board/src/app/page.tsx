import Link from "next/link";

export default function Home() {
  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      {/* Subtle glow */}
      <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(124,111,247,0.06)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(124,111,247,0.04)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 480, width: '100%', position: 'relative', zIndex: 1 }}>

        {/* Logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 900, color: 'white', letterSpacing: '-0.05em',
          }}>SQ</div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>Square</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginTop: 2 }}>청주고등학교 커뮤니티</div>
          </div>
        </div>

        {/* Main heading */}
        <h1 style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: '1rem' }}>
          청주고 학생들만의<br />
          <span style={{ color: 'var(--brand-light)' }}>자유로운 공간</span>
        </h1>

        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem' }}>
          자유게시판, 시간표, 급식 정보까지.<br />
          청주고의 모든 것이 여기 있습니다.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
          <Link href="/community/free" className="btn-primary" style={{ justifyContent: 'center', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700 }}>
            커뮤니티 입장하기 →
          </Link>
          <Link href="/signup" className="btn-secondary" style={{ justifyContent: 'center', padding: '0.85rem', fontSize: '0.9rem' }}>
            회원가입
          </Link>
          <Link href="/login" style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
            이미 계정이 있나요? 로그인
          </Link>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '2.5rem' }}>
          {['자유게시판', '시간표', '급식정보', '핫이슈', '등급 시스템'].map(f => (
            <span key={f} style={{
              fontSize: '0.72rem', fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 99, padding: '0.3rem 0.75rem',
            }}>{f}</span>
          ))}
        </div>
      </div>

      <footer style={{ position: 'absolute', bottom: '1.5rem', fontSize: '0.7rem', color: 'var(--text-faint)' }}>
        © 2026 Square · 청주고등학교
      </footer>
    </main>
  );
}
