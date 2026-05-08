"use client";

import { useEffect, useMemo, useState } from "react";

type MealType = "lunch" | "dinner";
type Ratings = Record<MealType, number | null>;

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

function StarRating({
  score,
  editable,
  saving,
  onChange,
}: {
  score: number | null;
  editable: boolean;
  saving: boolean;
  onChange: (score: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" aria-label={score ? `별점 ${score}점` : "별점 없음"}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (score ?? 0) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={!editable || saving}
            onClick={() => onChange(n)}
            className={[
              "grid h-9 w-9 place-items-center border text-lg font-black transition",
              active ? "border-amber-300 bg-amber-100 text-amber-500" : "border-slate-200 bg-white text-slate-300",
              editable ? "hover:border-amber-300 hover:text-amber-500" : "cursor-default",
              saving ? "opacity-60" : "",
            ].join(" ")}
            title={editable ? `${n}점 등록` : score ? `${score}점` : "아직 별점 없음"}
          >
            {active ? "★" : "☆"}
          </button>
        );
      })}
      <span className="ml-2 min-w-[42px] text-xs font-black text-slate-500">
        {score ? `${score}/5` : "-/5"}
      </span>
    </div>
  );
}

function MealCard({
  title,
  label,
  accent,
  items,
  loading,
  err,
  score,
  editable,
  saving,
  onRate,
}: {
  title: string;
  label: string;
  accent: "sky" | "indigo";
  items: string[];
  loading: boolean;
  err: string | null;
  score: number | null;
  editable: boolean;
  saving: boolean;
  onRate: (score: number) => void;
}) {
  const dot = accent === "sky" ? "bg-sky-500" : "bg-indigo-500";
  const tag = accent === "sky" ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-indigo-50 text-indigo-700 border-indigo-100";

  return (
    <section className="overflow-hidden border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 ${dot}`} />
            <h3 className="text-lg font-black text-slate-950">{title}</h3>
            <span className={`border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${tag}`}>
              {label}
            </span>
          </div>
          <p className="mt-2 text-xs font-bold text-slate-500">5점 만점 급식 별점</p>
        </div>
        <StarRating score={score} editable={editable} saving={saving} onChange={onRate} />
      </div>

      <div className="border border-slate-200 bg-slate-50 p-4 sm:p-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse bg-slate-200" />
            ))}
          </div>
        ) : err ? (
          <div className="py-12 text-center text-sm font-bold text-rose-500">{err}</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm font-bold text-slate-500">메뉴 정보가 없습니다.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((x, i) => (
              <li key={`${label}-${i}-${x}`} className="flex items-start gap-3 text-sm font-bold leading-6 text-slate-700">
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 ${dot}`} />
                <span>{x}</span>
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
  const [lunch, setLunch] = useState<string[]>([]);
  const [dinner, setDinner] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Ratings>({ lunch: null, dinner: null });
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
        setLunch([]);
        setDinner([]);
      } else {
        setLunch((Array.isArray(mealJson?.lunch) ? mealJson.lunch : []).map(stripDish).filter(Boolean));
        setDinner((Array.isArray(mealJson?.dinner) ? mealJson.dinner : []).map(stripDish).filter(Boolean));
      }

      const ratingJson = await ratingRes.json().catch(() => ({}));
      if (!ratingRes.ok || ratingJson?.error) {
        setRatingErr(ratingJson?.error ?? "별점을 불러오지 못했습니다.");
        setRatings({ lunch: null, dinner: null });
        setCanRate(false);
      } else {
        setRatings({
          lunch: Number.isInteger(ratingJson?.ratings?.lunch) ? ratingJson.ratings.lunch : null,
          dinner: Number.isInteger(ratingJson?.ratings?.dinner) ? ratingJson.ratings.dinner : null,
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MealCard
          title="점심"
          label="Lunch"
          accent="sky"
          items={lunch}
          loading={loading}
          err={err}
          score={ratings.lunch}
          editable={canRate}
          saving={saving === "lunch"}
          onRate={(score) => saveRating("lunch", score)}
        />
        <MealCard
          title="저녁"
          label="Dinner"
          accent="indigo"
          items={dinner}
          loading={loading}
          err={err}
          score={ratings.dinner}
          editable={canRate}
          saving={saving === "dinner"}
          onRate={(score) => saveRating("dinner", score)}
        />
      </div>

      <div className="border border-slate-200 bg-white p-5 text-center shadow-sm">
        <p className="text-xs font-bold tracking-wide text-slate-500">
          주말/방학/휴업일에는 급식 정보가 표시되지 않을 수 있습니다.
        </p>
      </div>
    </div>
  );
}
