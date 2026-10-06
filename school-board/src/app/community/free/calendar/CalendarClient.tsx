"use client";

import { useEffect, useMemo, useState } from "react";
import { useFreeBoard } from "../layout";
import type { AuthorIdentity } from "@/lib/authorDisplay";

type CalendarItem = {
  id: string;
  title: string;
  dueDate: string;
  type: string;
  subject: string;
  scope: string;
  memo: string;
  approvedAt?: string;
  pointsAwarded?: number;
  created_at: string;
  author_id: string | null;
  author?: AuthorIdentity | null;
};

const TYPES = ["시험", "과제", "수행평가", "동아리", "기타"];
const TYPE_STYLE: Record<string, string> = {
  시험: "border-rose-200 bg-rose-50 text-rose-700",
  과제: "border-sky-200 bg-sky-50 text-sky-800",
  수행평가: "border-violet-200 bg-violet-50 text-violet-700",
  동아리: "border-emerald-200 bg-emerald-50 text-emerald-700",
  기타: "border-slate-200 bg-slate-50 text-slate-700",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildMonthDays(current: Date) {
  const first = monthStart(current);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function fmtMonth(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function diffDays(dateKey: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateKey}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function ddayText(dateKey: string) {
  const diff = diffDays(dateKey);
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function canDeleteItem(item: CalendarItem, me: { userId: string | null; role: string }) {
  return Boolean(me.userId && (me.role === "admin" || String(item.author_id) === String(me.userId)));
}

function EventCard({
  item,
  compact,
  canDelete,
  onDelete,
}: {
  item: CalendarItem;
  compact?: boolean;
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className={`rounded-md border bg-white ${compact ? "px-2 py-1.5" : "p-3"} shadow-sm`}>
          <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TYPE_STYLE[item.type] ?? TYPE_STYLE["기타"]}`}>
              {item.type}
            </span>
            <span className="text-[10px] font-bold text-sky-700">{ddayText(item.dueDate)}</span>
            {item.approvedAt ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                승인 +{item.pointsAwarded ?? 20}
              </span>
            ) : null}
          </div>
          <div className={`mt-1 break-words font-semibold leading-snug text-slate-950 ${compact ? "line-clamp-2 text-[11px]" : "text-sm"}`}>
            {item.title}
          </div>
        </div>
        {canDelete && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="shrink-0 rounded border border-rose-100 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-100"
          >
            삭제
          </button>
        ) : null}
      </div>

      {!compact ? (
        <div className="mt-2 space-y-1 text-[12px] leading-5 text-slate-600">
          {item.subject ? <div>과목/분야: <span className="font-semibold text-slate-800">{item.subject}</span></div> : null}
          {item.scope ? <div>대상: <span className="font-semibold text-slate-800">{item.scope}</span></div> : null}
          {item.memo ? <div className="whitespace-pre-wrap break-words">{item.memo}</div> : null}
          <div className="text-[11px] text-slate-400">
            {item.author?.username ?? "unknown"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CalendarClient() {
  const { me } = useFreeBoard();
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(() => toDateKey(new Date()));
  const [type, setType] = useState("과제");
  const [subject, setSubject] = useState("");
  const [scope, setScope] = useState("");
  const [memo, setMemo] = useState("");

  const monthDays = useMemo(() => buildMonthDays(month), [month]);
  const canWrite = Boolean(me.userId && (me.role === "admin" || me.studentVerified));
  const todayKey = toDateKey(new Date());

  const range = useMemo(() => {
    const first = monthDays[0];
    const last = monthDays[monthDays.length - 1];
    return { start: toDateKey(first), end: toDateKey(last) };
  }, [monthDays]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const arr = map.get(item.dueDate) ?? [];
      arr.push(item);
      map.set(item.dueDate, arr);
    }
    return map;
  }, [items]);

  const selectedItems = itemsByDate.get(selectedDate) ?? [];
  const upcomingItems = useMemo(() => {
    return items.filter((item) => item.dueDate >= todayKey).slice(0, 6);
  }, [items, todayKey]);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const qs = new URLSearchParams(range);
      const res = await fetch(`/api/calendar?${qs.toString()}`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json?.error ?? "일정을 불러오지 못했습니다.");
        setItems([]);
        return;
      }
      setItems(Array.isArray(json?.data) ? json.data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  async function submit() {
    setMsg(null);
    if (!me.userId) return setMsg("로그인이 필요합니다.");
    if (!canWrite) return setMsg("개별인증 후 일정을 등록할 수 있습니다.");
    if (title.trim().length < 2) return setMsg("제목을 2글자 이상 입력해 주세요.");

    setBusy(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dueDate,
          type,
          subject: subject.trim(),
          scope: scope.trim(),
          memo: memo.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json?.error ?? "등록 실패");
        return;
      }

      setTitle("");
      setSubject("");
      setScope("");
      setMemo("");
      setSelectedDate(dueDate);
      setMsg("일정이 등록됐습니다.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: CalendarItem) {
    if (!confirm("이 일정을 삭제할까요?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/calendar?id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json?.error ?? "삭제 실패");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold leading-tight text-slate-950">마감 캘린더</h2>
            <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
              시험, 과제, 수행평가, 동아리 일정을 날짜별로 같이 정리합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, -1))}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => {
                const now = monthStart(new Date());
                setMonth(now);
                setSelectedDate(todayKey);
                setDueDate(todayKey);
              }}
              className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] font-semibold text-sky-800 hover:bg-sky-100"
            >
              오늘
            </button>
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, 1))}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              다음
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="text-base font-bold text-slate-950">{fmtMonth(month)}</div>
            <div className="text-[11px] font-medium text-slate-500">
              {loading ? "불러오는 중..." : `일정 ${items.length}개`}
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div key={day} className="px-2 py-1.5 text-center text-[11px] font-bold text-slate-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthDays.map((date) => {
              const key = toDateKey(date);
              const dayItems = itemsByDate.get(key) ?? [];
              const inMonth = date.getMonth() === month.getMonth();
              const selected = key === selectedDate;
              const isToday = key === todayKey;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedDate(key);
                    setDueDate(key);
                  }}
                  className={
                    "relative min-h-[5.2rem] border-b border-r border-slate-100 p-1.5 pt-7 text-left align-top transition-colors hover:bg-sky-50/50 sm:min-h-[5.6rem] sm:p-2 sm:pt-7 lg:min-h-[5.9rem] " +
                    (selected ? "bg-sky-50 ring-1 ring-inset ring-sky-200" : "bg-white")
                  }
                >
                  <span
                    className={
                      "absolute left-1.5 top-1.5 inline-flex min-w-0 items-start justify-start rounded-md px-1 py-0.5 text-[11px] font-bold leading-none sm:left-2 sm:top-2 " +
                      (isToday
                        ? "bg-sky-700 text-white"
                        : inMonth
                          ? "text-slate-800"
                          : "text-slate-300")
                    }
                  >
                    {date.getDate()}
                  </span>
                  {dayItems.length > 0 ? (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-sky-800 sm:right-2 sm:top-2">
                      {dayItems.length}
                    </span>
                  ) : null}

                  <div className="space-y-0.5 sm:space-y-1">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className={`truncate rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-4 ${TYPE_STYLE[item.type] ?? TYPE_STYLE["기타"]}`}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 2 ? (
                      <div className="text-[10px] font-semibold leading-4 text-slate-400">+{dayItems.length - 2}개 더</div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-950">일정 등록</h3>
                <p className="mt-1 text-[11px] text-slate-500">반, 동아리, 과목 단위로 적어두면 됩니다.</p>
              </div>
            </div>

            {!canWrite ? (
              <div className="mt-3 rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-[12px] leading-5 text-slate-700">
                {me.userId ? "개별인증 후 일정을 등록할 수 있습니다." : "로그인 후 일정을 등록할 수 있습니다."}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[12px] font-bold text-slate-800">마감 날짜</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    setSelectedDate(e.target.value);
                  }}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-800">구분</label>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {TYPES.map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => setType(x)}
                      className={
                        "rounded-md border px-2 py-1.5 text-[11px] font-semibold transition-colors " +
                        (type === x ? TYPE_STYLE[x] : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
                      }
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-800">제목</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="예: 수학 수행평가 보고서"
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <label className="text-[12px] font-bold text-slate-800">과목/분야</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={80}
                    placeholder="예: 영어, 과학, 방송부"
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-slate-800">대상</label>
                  <input
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    maxLength={80}
                    placeholder="예: 2-7, 1학년 전체, 방송부"
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-800">메모</label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="제출 위치, 준비물, 범위 같은 걸 적어주세요."
                  className="mt-1 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5 text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              {msg ? <div className="text-[12px] font-medium text-slate-600">{msg}</div> : null}

              <button
                type="button"
                onClick={submit}
                disabled={!canWrite || busy || title.trim().length < 2}
                className="w-full rounded-md border border-sky-700 bg-sky-700 px-4 py-2 text-[12px] font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "저장 중..." : "마감 일정 추가"}
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-950">{selectedDate} 일정</h3>
              <span className="text-[11px] font-semibold text-slate-500">{selectedItems.length}개</span>
            </div>
            {selectedItems.length === 0 ? (
              <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-6 text-center text-[12px] text-slate-500">
                선택한 날짜에 등록된 일정이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <EventCard
                    key={item.id}
                    item={item}
                    canDelete={canDeleteItem(item, me)}
                    onDelete={() => remove(item)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-950">다가오는 마감</h3>
            </div>
            {upcomingItems.length === 0 ? (
              <div className="text-[12px] text-slate-500">이번 달에 다가오는 마감이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {upcomingItems.map((item) => (
                  <EventCard key={item.id} item={item} compact />
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
