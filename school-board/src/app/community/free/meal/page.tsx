"use client";

import { useEffect, useMemo, useState } from "react";

type MealType = "breakfast" | "lunch" | "dinner";
type Ratings = Record<MealType, number | null>;

const MEALS: Array<{ type: MealType; title: string; label: string; color: string }> = [
  { type: "breakfast", title: "조식", label: "Breakfast", color: "bg-emerald-500" },
  { type: "lunch", title: "점심", label: "Lunch", color: "bg-sky-500" },
  { type: "dinner", title: "저녁", label: "Dinner", color: "bg-indigo-500" },
];

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function addDays(ymd: string, delta: number) {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6));
  const d = Number(ymd.slice(6, 8));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

function fmtYMD(ymd: string) {
  return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}

function stripDish(raw: string) {
  let s = raw.replace(/\*/g, "").trim();
  s = s.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  return s;
}

function normalizeScore(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 5) return null;
  return Math.round(n * 10) / 10;
}

function StarPreview({ score }: { score: number | null }) {
  const value = score ?? 0;

  return (
    <div className="flex items-center gap-0.5" aria-label={`별점 ${value.toFixed(1)}점`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <span key={n} className="relative inline-block h-4 w-4 text-[15px] leading-4 text-slate-300">
            <span>★</span>
            <span
              className="absolute left-0 top-0 overflow-hidden text-amber-400"
              style={{ width: `${fill * 100}%` }}
              aria-hidden="true"
            >
              ★
            </span>
          </span>
        );
      })}
      <span className="ml-1 text-[11px] font-black text-slate-500">{score === null ? "-/5" : `${score.toFixed(1)}/5`}</span>
    </div>
  );
}

function RatingEditor({
  score,
  saving,
  onSave,
}: {
  score: number | null;
  saving: boolean;
  onSave: (score: number) => void;
}) {
  const [value, setValue] = useState(score === null ? "" : String(score));

  useEffect(() => {
    setValue(score === null ? "" : String(score));
  }, [score]);

  const parsed = normalizeScore(value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        min="0"
        max="5"
        step="0.1"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-20 border border-slate-300 bg-white px-2 text-right text-sm font-black text-slate-900 outline-none focus:border-sky-500"
        placeholder="3.5"
      />
      <button
        type="button"
        disabled={saving || parsed === null}
        onClick={() => parsed !== null && onSave(parsed)}
        className="h-8 border border-emerald-600 bg-emerald-600 px-3 text-xs font-black text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
      >
        {saving ? "저장중" : "저장"}
      </button>
    </div>
  );
}

function MealCard({
  title,
  label,
  color,
  items,
  loading,
  err,
  score,
  canRate,
  saving,
  onRate,
}: {
  title: string;
  label: string;
  color: string;
  items: string[];
  loading: boolean;
  err: string | null;
  score: number | null;
  canRate: boolean;
  saving: boolean;
  onRate: (score: number) => void;
}) {
  return (
    <section className="min-w-0 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 ${color}`} />
          <h3 className="shrink-0 whitespace-nowrap text-base font-black text-slate-950">{title}</h3>
          <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        </div>
        <div className="flex flex-col gap-2">
          <StarPreview score={score} />
          {score === null ? <p className="text-[11px] font-bold text-slate-400">아직 평가 안 됨</p> : null}
          {canRate ? <RatingEditor score={score} saving={saving} onSave={onRate} /> : null}
        </div>
      </div>

      <div className="border border-slate-200 bg-slate-50 p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse bg-slate-200" />
            ))}
          </div>
        ) : err ? (
          <div className="py-10 text-center text-sm font-bold text-rose-500">{err}</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm font-bold text-slate-500">메뉴 정보가 없습니다.</div>
        ) : (
          <ul className="space-y-2.5">
            {items.map((x, i) => (
              <li key={`${label}-${i}-${x}`} className="flex items-start gap-2.5 text-sm font-bold leading-6 text-slate-700">
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 ${color}`} />
                <span className="min-w-0 break-words">{x}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function MealPage() {
  const [ymd, setYmd] = useState<string>(todayYMD());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<MealType | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ratingErr, setRatingErr] = useState<string | null>(null);
  const [menus, setMenus] = useState<Record<MealType, string[]>>({ breakfast: [], lunch: [], dinner: [] });
  const [ratings, setRatings] = useState<Ratings>({ breakfast: null, lunch: null, dinner: null });
  const [canRate, setCanRate] = useState(false);

  const title = useMemo(() => "청주고등학교 급식 정보", []);

  async function load(targetYmd: string) {
    setLoading(true);
    setErr(null);
    setRatingErr(null);
    try {
      const [mealRes, ratingRes] = await Promise.all([
        fetch(`/api/neis/meal?ymd=${encodeURIComponent(targetYmd)}`, { cache: "no-store" }),
        fetch(`/api/neis/meal/rating?ymd=${encodeURIComponent(targetYmd)}`, { cache: "no-store" }),
      ]);

      const mealJson = await mealRes.json().catch(() => ({}));
      if (!mealRes.ok || mealJson?.error) {
        setErr(mealJson?.error ?? "급식 정보를 불러오지 못했습니다.");
        setMenus({ breakfast: [], lunch: [], dinner: [] });
      } else {
        setMenus({
          breakfast: (Array.isArray(mealJson?.breakfast) ? mealJson.breakfast : []).map(stripDish).filter(Boolean),
          lunch: (Array.isArray(mealJson?.lunch) ? mealJson.lunch : []).map(stripDish).filter(Boolean),
          dinner: (Array.isArray(mealJson?.dinner) ? mealJson.dinner : []).map(stripDish).filter(Boolean),
        });
      }

      const ratingJson = await ratingRes.json().catch(() => ({}));
      if (!ratingRes.ok || ratingJson?.error) {
        setRatingErr(ratingJson?.error ?? "별점을 불러오지 못했습니다.");
        setRatings({ breakfast: null, lunch: null, dinner: null });
        setCanRate(false);
      } else {
        setRatings({
          breakfast: normalizeScore(ratingJson?.ratings?.breakfast),
          lunch: normalizeScore(ratingJson?.ratings?.lunch),
          dinner: normalizeScore(ratingJson?.ratings?.dinner),
        });
        setCanRate(Boolean(ratingJson?.canRate));
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveRating(mealType: MealType, score: number) {
    setSaving(mealType);
    setRatingErr(null);
    try {
      const res = await fetch("/api/neis/meal/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ymd, mealType, score }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) {
        setRatingErr(json?.error ?? "별점 저장에 실패했습니다.");
        return;
      }
      setRatings((prev) => ({ ...prev, [mealType]: score }));
    } finally {
      setSaving(null);
    }
  }

  useEffect(() => {
    load(ymd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ymd]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">{title}</h2>
          <p className="mt-1 text-xs font-black uppercase tracking-widest text-sky-700">
            청주고 {fmtYMD(ymd)} Daily Menu
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
          <button onClick={() => setYmd(addDays(ymd, -1))} className="btn-ghost px-3 py-2 text-sm sm:px-4">
            이전
          </button>
          <button onClick={() => setYmd(todayYMD())} className="btn-secondary px-3 py-2 text-sm sm:min-w-[120px] sm:px-6">
            {ymd === todayYMD() ? "오늘" : fmtYMD(ymd)}
          </button>
          <button onClick={() => setYmd(addDays(ymd, 1))} className="btn-ghost px-3 py-2 text-sm sm:px-4">
            다음
          </button>
        </div>
      </div>

      {ratingErr ? (
        <div className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
          {ratingErr}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MEALS.map((meal) => (
          <MealCard
            key={meal.type}
            title={meal.title}
            label={meal.label}
            color={meal.color}
            items={menus[meal.type]}
            loading={loading}
            err={err}
            score={ratings[meal.type]}
            canRate={canRate}
            saving={saving === meal.type}
            onRate={(score) => saveRating(meal.type, score)}
          />
        ))}
      </div>

      <div className="border border-slate-200 bg-white p-5 text-center shadow-sm">
        <p className="text-xs font-bold tracking-wide text-slate-500">
          주말/방학/휴업일에는 급식 정보가 표시되지 않을 수 있습니다.
        </p>
      </div>
    </div>
  );
}
