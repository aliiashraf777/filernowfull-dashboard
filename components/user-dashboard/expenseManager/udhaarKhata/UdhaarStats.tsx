// dashboard\components\user-dashboard\expenseManager\udhaarKhata\UdhaarStats.tsx
// Colours now follow gave = red and got = green. The cards keep their component props.

"use client";
import { useMemo } from "react";
import { CircleDollarSign, ArrowDownCircle, ArrowUpCircle, CheckCircle2 } from "lucide-react";
import ExpenseStatCard from "../expenseStats/ExpensesStatCard";
import { exportEntriesToCsv } from "@/lib/utils/exportCsv";
import { udhaarSummary } from "@/lib/utils/udhaarStats";
import { IExpenseEntry, ICategory, IExpenseStatItem, KHATA_LABELS } from "@/types/expenseManagerTy";

const pk = (n: number) => `PKR ${n.toLocaleString("en-PK")}`;

export default function UdhaarStats({ debtEntries, categories, onCtaClick, onView }: {
    debtEntries: IExpenseEntry[]; categories: ICategory[]; onCtaClick: () => void; onView: () => void;
}) {
    const { current, net, get, give, settled } = useMemo(() => udhaarSummary(debtEntries), [debtEntries]);
    const label = "vs last month";

    const items: (IExpenseStatItem & { ctaLabel?: string })[] = [
        {
            // signed: a minus means you owe more than you are owed
            id: "net", title: "Net Udhaar", value: `${current.net < 0 ? "-" : ""}${pk(Math.abs(current.net))}`,
            trendDirection: net.direction, trendPercent: net.percent, trendLabel: label,
            icon: CircleDollarSign, chip: "purple", isPositive: net.direction === "up", ctaLabel: KHATA_LABELS.debt.verb
        },
        {
            id: "get", title: "Aap ko milenge", value: pk(current.get),
            trendDirection: get.direction, trendPercent: get.percent, trendLabel: label,
            icon: ArrowUpCircle, chip: "red", isPositive: get.direction === "up"
        },
        {
            // owing more is bad news, so "down" is the good direction here
            id: "give", title: "Aap ko dene hain", value: pk(current.give),
            trendDirection: give.direction, trendPercent: give.percent, trendLabel: label,
            icon: ArrowDownCircle, chip: "green", isPositive: give.direction === "down"
        },
        {
            id: "settled", title: "Settled parties", value: `${current.settled}`,
            trendDirection: settled.direction, trendPercent: settled.percent, trendLabel: label,
            icon: CheckCircle2, chip: "blue", isPositive: settled.direction === "up"
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-brand-8 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
                <ExpenseStatCard key={item.id} item={item} onView={onView}
                    onExport={() => exportEntriesToCsv(debtEntries, categories, `${item.id}-udhaar-export.csv`)}
                    ctaLabel={item.ctaLabel} onCtaClick={item.ctaLabel ? onCtaClick : undefined} />
            ))}
        </div>
    );
}