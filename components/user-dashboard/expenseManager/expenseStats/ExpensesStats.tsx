// components/user-dashboard/expenseManager/ExpensesStats.tsx

"use client";

import { useState } from "react";
import { Wallet, TrendingUp, TrendingDown, CircleDollarSign } from "lucide-react";
import { IExpenseEntry, ICategory, EntryKind, IExpenseStatItem, KHATA_LABELS, ICard, MAX_CARDS } from "@/types/expenseManagerTy";
import { exportEntriesToCsv } from "@/lib/utils/exportCsv";
import ExpenseStatCard from "./ExpensesStatCard";
import CardFormDialog from "../cardsManager/CardFormDialog";
import DetailedEntryDialog, { EntrySavePayload } from "./DetailedEntryDialog";
import { useExpenseManagerStore } from "@/hooks/useExpenseManagerStore";
import { cashFlow, debtBalances, debtTotals } from "@/lib/utils/debt";
import { exposureTrend } from "@/lib/utils/udhaarStats";

interface ExpensesStatsProps {
    entries: IExpenseEntry[];
    categories: ICategory[];
    cards: ICard[];
    onViewKind: (kind: EntryKind | "all") => void;
    onSaved: (v: EntrySavePayload) => void;
    onAddCard: (card: Omit<ICard, "id">) => void;
}

type Delta = { percent: number; direction: "up" | "down" };
// nothing to compare against (no data, or nothing last month): 0%, shown as a neutral grey chip
const FLAT: Delta = { percent: 0, direction: "up" };

const monthKey = (d: string) => d.slice(0, 7);
// LOCAL month. toISOString() is UTC: in the first hours of the 1st in Pakistan it would still say last month.
const localMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const shiftMonth = (key: string, offset: number) => {
    const [y, m] = key.split("-").map(Number);
    return localMonthKey(new Date(y, m - 1 + offset, 1));
};

/** This month vs last month, as a % and an up/down direction. */
function monthlyDelta(entries: IExpenseEntry[], kind: "income" | "expense"): Delta {
    if (entries.length === 0) return FLAT;

    const now = localMonthKey(new Date());
    const prev = shiftMonth(now, -1);
    const totalFor = (key: string) =>
        entries.filter((e) => e.kind === kind && monthKey(e.date) === key).reduce((s, e) => s + e.amount, 0);

    const current = totalFor(now);
    const previous = totalFor(prev);
    if (previous === 0) return FLAT;

    return {
        percent: Math.round((Math.abs(current - previous) / Math.abs(previous)) * 100),
        direction: current >= previous ? "up" : "down",
    };
}

export default function ExpensesStats({ entries = [], categories = [], cards = [], onViewKind, onSaved, onAddCard }: ExpensesStatsProps) {
    const store = useExpenseManagerStore();
    const [dialogKind, setDialogKind] = useState<EntryKind | null>(null);
    const [cardDialogOpen, setCardDialogOpen] = useState(false);

    const totalIncome = entries.filter((e) => e.kind === "income").reduce((s, e) => s + e.amount, 0);
    const totalExpenses = entries.filter((e) => e.kind === "expense").reduce((s, e) => s + e.amount, 0);

    const { youWillGet, youWillGive } = debtTotals(debtBalances(entries));
    const totalDebt = Math.abs(youWillGet - youWillGive); // net udhaar
    const cardsBalance = cards.reduce((s, c) => s + c.balance, 0);

    // The card shows a BALANCE, so its trend compares the balance now with the balance at the start of
    // this month (= end of last month): today's balance minus this month's cash flow on cards.
    const monthStart = `${localMonthKey(new Date())}-01`;
    const flowThisMonth = entries
        .filter((e) => e.cardId && e.kind !== "debt" && e.date.slice(0, 10) >= monthStart)
        .reduce((s, e) => s + cashFlow(e) * e.amount, 0);
    const startBalance = cardsBalance - flowThisMonth;
    const bal: Delta =
        startBalance === 0
            ? FLAT
            : {
                percent: Math.round((Math.abs(flowThisMonth) / Math.abs(startBalance)) * 100),
                direction: flowThisMonth >= 0 ? "up" : "down",
            };

    const inc = monthlyDelta(entries, "income");
    const exp = monthlyDelta(entries, "expense");
    const debt = exposureTrend(entries); // same measure as the card's value: net udhaar, now vs end of last month

    const atMaxCards = cards.length >= MAX_CARDS;

    const items: (IExpenseStatItem & { filterKind: EntryKind | "all"; ctaLabel?: string })[] = [
        {
            id: "cardBalance",
            title: "Total Cards Balance",
            value: `PKR ${cardsBalance.toLocaleString("en-PK")}`,
            trendDirection: bal.direction,
            trendPercent: bal.percent,
            trendLabel: "vs last month",
            icon: Wallet,
            chip: "green",
            isPositive: bal.direction === "up",
            filterKind: "all"
        },
        {
            id: "aamdani",
            title: KHATA_LABELS.income.title,
            value: `PKR ${totalIncome.toLocaleString("en-PK")}`,
            trendDirection: inc.direction,
            trendPercent: inc.percent,
            trendLabel: "vs last month",
            icon: TrendingUp,
            chip: "blue",
            isPositive: inc.direction === "up",
            filterKind: "income",
            ctaLabel: KHATA_LABELS.income.verb
        },
        {
            id: "kharcha",
            title: KHATA_LABELS.expense.title,
            value: `PKR ${totalExpenses.toLocaleString("en-PK")}`,
            trendDirection: exp.direction,
            trendPercent: exp.percent,
            trendLabel: "vs last month",
            icon: TrendingDown,
            chip: "purple",
            isPositive: exp.direction === "down",
            filterKind: "expense",
            ctaLabel: KHATA_LABELS.expense.verb
        },
        {
            id: "udhaar",
            title: KHATA_LABELS.debt.title,
            value: `PKR ${totalDebt.toLocaleString("en-PK")}`,
            trendDirection: debt.direction,
            trendPercent: debt.percent,
            trendLabel: "vs last month",
            icon: CircleDollarSign,
            chip: "red",
            isPositive: debt.direction === "down", // owing / being owed less is the good direction
            filterKind: "debt",
            ctaLabel: KHATA_LABELS.debt.verb
        },
    ];

    return (
        <>
            <div className="grid grid-cols-1 gap-brand-12 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((item) => item.id === "cardBalance" ? (
                    <ExpenseStatCard
                        key={item.id}
                        item={item}
                        onView={() => onViewKind("all")}
                        onExport={() => exportEntriesToCsv(entries, categories, "all-export.csv")}
                        ctaLabel="Add Card"
                        onCtaClick={() => setCardDialogOpen(true)}
                        ctaDisabled={atMaxCards}
                        ctaTitle={atMaxCards ? `Max ${MAX_CARDS} cards` : undefined}
                    />
                ) : (
                    <ExpenseStatCard
                        key={item.id}
                        item={item}
                        onView={() => onViewKind(item.filterKind)}
                        onExport={() => exportEntriesToCsv(
                            entries.filter((e) => e.kind === item.filterKind),
                            categories,
                            `${item.id}-export.csv`
                        )}
                        ctaLabel={item.ctaLabel}
                        onCtaClick={() => setDialogKind(item.filterKind === "all" ? null : item.filterKind)}
                    />
                ))}
            </div>

            <CardFormDialog
                open={cardDialogOpen}
                onOpenChange={setCardDialogOpen}
                hideTrigger
                onAdd={onAddCard}
                onUpdate={() => { }}
            />

            <DetailedEntryDialog
                kind={dialogKind}
                categories={categories}
                cards={cards}
                onClose={() => setDialogKind(null)}
                onSaved={onSaved}
                parties={store.parties}
                onAddParty={store.addParty}
            />
        </>
    );
}