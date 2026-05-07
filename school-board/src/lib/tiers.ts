export type Tier = {
    name: string;
    minPoints: number;
    icon: string;
    color: string;
    bg: string;
    border: string;
};

export const TIERS: Tier[] = [
    {
        name: "뉴비",
        minPoints: 0,
        icon: "🌱",
        color: "text-slate-400",
        bg: "bg-slate-500/10",
        border: "border-slate-500/20",
    },
    {
        name: "브론즈",
        minPoints: 20,
        icon: "🥉",
        color: "text-amber-600",
        bg: "bg-amber-600/10",
        border: "border-amber-600/20",
    },
    {
        name: "실버",
        minPoints: 50,
        icon: "🥈",
        color: "text-slate-300",
        bg: "bg-slate-300/10",
        border: "border-slate-300/20",
    },
    {
        name: "골드",
        minPoints: 150,
        icon: "🥇",
        color: "text-yellow-400",
        bg: "bg-yellow-400/10",
        border: "border-yellow-400/20",
    },
    {
        name: "플래티넘",
        minPoints: 400,
        icon: "💎",
        color: "text-emerald-400",
        bg: "bg-emerald-400/10",
        border: "border-emerald-400/20",
    },
    {
        name: "다이아몬드",
        minPoints: 800,
        icon: "🔮",
        color: "text-sky-400",
        bg: "bg-sky-400/10",
        border: "border-sky-400/20",
    },
    {
        name: "마스터",
        minPoints: 1500,
        icon: "👑",
        color: "text-rose-400",
        bg: "bg-rose-400/10",
        border: "border-rose-400/20",
    },
];

export const ADMIN_TIER: Tier = {
    name: "관리자",
    minPoints: -1,
    icon: "🛡️",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
};

export function getTier(points: number, role?: string): Tier {
    if (role === "admin") return ADMIN_TIER;

    for (let i = TIERS.length - 1; i >= 0; i--) {
        if (points >= TIERS[i].minPoints) {
            return TIERS[i];
        }
    }
    return TIERS[0];
}
