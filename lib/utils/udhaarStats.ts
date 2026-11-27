// dashboard\lib\utils\udhaarStats.ts

import { IExpenseEntry } from "@/types/expenseManagerTy";
import { debtBalances, debtTotals } from "./debt";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export type Snapshot = { get: number; give: number; net: number; settled: number };
export type Trend = { percent: number; direction: "up" | "down" };
export type UdhaarSummary = { current: Snapshot; net: Trend; get: Trend; give: Trend; settled: Trend };

/** Receivables/payables counting only entries dated on or before `cutoff` ("YYYY-MM-DD"; none = everything). */
function snapshot(entries: IExpenseEntry[], cutoff?: string): Snapshot {
    const upTo = cutoff ? entries.filter((e) => e.date.slice(0, 10) <= cutoff) : entries;
    const balances = debtBalances(upTo);
    const { youWillGet, youWillGive } = debtTotals(balances);
    return {
        get: youWillGet,
        give: youWillGive,
        net: youWillGet - youWillGive,
        settled: [...balances.values()].filter((v) => v === 0).length,
    };
}

/** Change as % + direction. Previous 0 = nothing to compare against, so 0%. */
function change(current: number, previous: number): Trend {
    if (previous === 0) return { percent: 0, direction: "up" };
    return {
        percent: Math.round((Math.abs(current - previous) / Math.abs(previous)) * 100),
        direction: current >= previous ? "up" : "down",
    };
}

/** `now` is a parameter so tests can pin the date. */
export function udhaarSummary(entries: IExpenseEntry[], now = new Date()): UdhaarSummary {
    const lastMonthEnd = ymd(new Date(now.getFullYear(), now.getMonth(), 0)); // day 0 = last day of previous month
    const current = snapshot(entries);
    const previous = snapshot(entries, lastMonthEnd);
    return {
        current,
        net: change(current.net, previous.net),
        get: change(current.get, previous.get),
        give: change(current.give, previous.give),
        settled: change(current.settled, previous.settled),
    };
}