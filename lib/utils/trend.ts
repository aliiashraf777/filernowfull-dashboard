// dashboard\lib\utils\trend.ts

import { IExpenseEntry } from "@/types/expenseManagerTy";
import { cashFlow, debtSign } from "./debt";

export function buildTrend(
    entries: { date: string; kind: string; amount: number }[],
    keyFn: (d: string) => string,
    limit: number
) {
    const map = new Map<string, { expense: number; income: number; debt: number }>();

    entries.forEach((e) => {
        const key = keyFn(e.date);
        const b = map.get(key) ?? { expense: 0, income: 0, debt: 0 };
        (b as any)[e.kind] += e.amount;
        map.set(key, b);
    });

    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-limit)
        .map(([label, v]) => ({ label, ...v }));
}

// export function weekKey(dateStr: string) {
//     const d = new Date(dateStr);
//     const jan1 = new Date(d.getFullYear(), 0, 1);
//     const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);

//     return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
// }

export function weekKey(dateStr: string) {
    // Parse "YYYY-MM-DD" as a LOCAL date. new Date("2026-09-10") means midnight UTC, which is still the
    // previous evening west of UTC and would put the entry in the wrong day/week.
    const [y, m, day] = dateStr.slice(0, 10).split("-").map(Number);
    const d = new Date(y, m - 1, day);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = Math.round((d.getTime() - jan1.getTime()) / 86400000); // round: DST days are 23/25h
    const week = Math.ceil((dayOfYear + jan1.getDay() + 1) / 7);

    return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function buildDebtTrend(entries: IExpenseEntry[], keyFn: (d: string) => string, limit: number) {
    const map = new Map<string, { gave: number; got: number }>();
    entries.forEach((e) => {
        const s = debtSign(e);
        if (!s) return;
        const key = keyFn(e.date);
        const b = map.get(key) ?? { gave: 0, got: 0 };
        if (s > 0) b.gave += e.amount; else b.got += e.amount;
        map.set(key, b);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-limit).map(([label, v]) => ({ label, ...v }));
}

/** Udhaar CASH per bucket: gave = money that left your pocket, got = money that came in. Forgiven (maaf) moves none. */
export function buildDebtCashTrend(entries: IExpenseEntry[], keyFn: (d: string) => string, limit: number) {
    const map = new Map<string, { gave: number; got: number }>();
    entries.forEach((e) => {
        if (e.kind !== "debt") return;
        const flow = cashFlow(e);
        if (!flow) return;
        const key = keyFn(e.date);
        const b = map.get(key) ?? { gave: 0, got: 0 };
        if (flow < 0) b.gave += e.amount; else b.got += e.amount;
        map.set(key, b);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-limit).map(([label, v]) => ({ label, ...v }));
}