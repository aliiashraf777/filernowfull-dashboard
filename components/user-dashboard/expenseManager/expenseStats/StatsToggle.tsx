// dashboard\components\user-dashboard\expenseManager\expenseStats\StatsToggle.tsx

"use client";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";

/** Strip like the mobile one: shows/hides the chart section. */
export default function StatsToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
    return (
        <div className="flex items-center justify-between rounded-brand-12 border border-border-clr bg-white px-brand-12 py-brand-8">
            <span className="flex items-center gap-brand-8 para-tiny font-medium text-text-secondary">
                <BarChart3 size={15} className="text-primary" /> Charts &amp; breakdowns
            </span>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="flex cursor-pointer items-center gap-1.5 rounded-brand-8 border border-border-clr px-3 py-1.5 para-tiny font-semibold text-text-secondary default-transition hover:bg-page-bg"
            >
                {open ? "Hide stats" : "View stats"} {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
        </div>
    );
}