"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type VerifiedRow = {
  userId: string;
  username: string | null;
  studentNo: string | null;
  studentName: string | null;
  grade: number | null;
  classNo: number | null;
  verifiedAt: string | null;
};

type ApiData = {
  total: number;
  byGrade: Record<string, number>;
  byClass: Record<string, Record<string, number>>;
  rows: VerifiedRow[];
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return value;
  }
}

function countClass(rows: VerifiedRow[], grade: number | "all", classNo: number) {
  return rows.filter((row) => {
    if (grade !== "all" && row.grade !== grade) return false;
    return row.classNo === classNo;
  }).length;
}

export default function AdminVerifiedStudentsPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grade, setGrade] = useState<number | "all">("all");
  const [classNo, setClassNo] = useState<number | "all">("all");
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verified-students", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "인증 목록을 불러오지 못했습니다.");
      setData(json.data);
    } catch (e: any) {
      setError(e?.message ?? "인증 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = data?.rows ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (grade !== "all" && row.grade !== grade) return false;
      if (classNo !== "all" && row.classNo !== classNo) return false;
      if (!q) return true;
      return [
        row.username,
        row.studentNo,
        row.studentName,
        row.grade ? `${row.grade}학년` : "",
        row.classNo ? `${row.classNo}반` : "",
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [rows, grade, classNo, query]);

  const gradeTabs = [
    { key: "all" as const, label: "전체", count: data?.total ?? 0 },
    { key: 1 as const, label: "1학년", count: data?.byGrade?.["1"] ?? 0 },
    { key: 2 as const, label: "2학년", count: data?.byGrade?.["2"] ?? 0 },
    { key: 3 as const, label: "3학년", count: data?.byGrade?.["3"] ?? 0 },
  ];

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-600">
        개별인증 목록을 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
        <div className="text-sm font-semibold text-rose-700">{error}</div>
        <button type="button" onClick={load} className="mt-3 rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">
          다시 불러오기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">Student Verification</div>
            <h1 className="mt-1 text-xl font-semibold text-slate-950">개별인증 현황</h1>
            <p className="mt-1 text-xs font-medium text-slate-500">
              인증된 계정 {data?.total ?? 0}명
              <span className="mx-1.5 text-slate-300">|</span>
              현재 표시 {filtered.length}명
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/community/free/admin/dashboard" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              관리자
            </Link>
            <button type="button" onClick={load} className="btn-primary px-3 py-2 text-xs">
              새로고침
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {gradeTabs.map((tab) => (
            <button
              key={String(tab.key)}
              type="button"
              onClick={() => {
                setGrade(tab.key);
                setClassNo("all");
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                grade === tab.key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              {tab.label}
              <span className="ml-1 opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setClassNo("all")}
            className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
              classNo === "all"
                ? "border-sky-700 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            전체반
          </button>
          {Array.from({ length: 11 }, (_, i) => i + 1).map((no) => {
            const count = countClass(rows, grade, no);
            return (
              <button
                key={no}
                type="button"
                onClick={() => setClassNo(no)}
                className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  classNo === no
                    ? "border-sky-700 bg-sky-50 text-sky-800"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {no}반
                <span className="ml-1 opacity-65">{count}</span>
              </button>
            );
          })}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="아이디, 학번, 이름 검색"
          className="mt-3 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[0.8fr_0.9fr_1fr_0.8fr_0.8fr] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold text-slate-500 sm:grid">
          <div>학번</div>
          <div>이름</div>
          <div>아이디</div>
          <div>학년/반</div>
          <div>인증일</div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm font-medium text-slate-500">조건에 맞는 인증 계정이 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <div
                key={row.userId}
                className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[0.8fr_0.9fr_1fr_0.8fr_0.8fr] sm:gap-3 sm:text-xs"
              >
                <div className="font-semibold text-slate-950">{row.studentNo ?? "-"}</div>
                <div className="font-medium text-slate-800">{row.studentName ?? "-"}</div>
                <div className="truncate text-slate-600">{row.username ?? "아이디 없음"}</div>
                <div className="text-slate-600">
                  {row.grade && row.classNo ? `${row.grade}학년 ${row.classNo}반` : "-"}
                </div>
                <div className="text-slate-500">{fmtDate(row.verifiedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
