import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] h-64 w-64 rounded-full bg-sky-500/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-64 w-64 rounded-full bg-indigo-500/20 blur-[120px]" />

      <div className="glass max-w-4xl rounded-xl p-8 text-center sm:p-12">
        <div className="mb-6 inline-flex items-center rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-sky-400 uppercase">
          CheongJu High School Community
        </div>

        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
          청주고 학생들의 공간, <br />
          <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            Square
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400">
          청주고등학교 학생들을 위한 소통과 정보의 중심. <br className="hidden sm:inline" />
          자유게시판부터 시간표, 급식 정보까지 하나로 연결됩니다.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/community/free"
            className="btn-primary w-full px-8 py-4 text-base sm:w-auto"
          >
            커뮤니티 시작하기
          </Link>
          <Link
            href="/signup"
            className="btn-secondary w-full px-8 py-4 text-base sm:w-auto"
          >
            회원가입
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
          <div className="glass rounded-lg p-5">
            <div className="mb-3 text-2xl">💬</div>
            <h3 className="mb-1 text-sm font-bold text-slate-100">자유로운 소통</h3>
            <p className="text-xs text-slate-500">익명성과 신뢰가 공존하는 우리만의 게시판</p>
          </div>
          <div className="glass rounded-lg p-5">
            <div className="mb-3 text-2xl">📅</div>
            <h3 className="mb-1 text-sm font-bold text-slate-100">편리한 학교생활</h3>
            <p className="text-xs text-slate-500">시간표와 급식 정보를 실시간으로 확인</p>
          </div>
          <div className="glass rounded-lg p-5">
            <div className="mb-3 text-2xl">🗳️</div>
            <h3 className="mb-1 text-sm font-bold text-slate-100">학생 자치</h3>
            <p className="text-xs text-slate-500">투표를 통한 학생들의 의견 수렴 및 피드백</p>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-8 text-xs text-slate-600">
        © 2026 Square. Created with ❤️ for CJHS Students.
      </footer>
    </main>
  );
}
