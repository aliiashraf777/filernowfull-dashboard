// components/user-dashboard/expenseManager/expenseStats/ExpensesStatCard.tsx

"use client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, ArrowUp, ArrowDown, Minus, Eye, Download, Pencil } from "lucide-react";
import { cn } from "@/lib/cn";
import { IExpenseStatItem, StatChipVariant } from "@/types/expenseManagerTy";

// Same look as the mobile cards and the Party tiles: a very light tint, a thin 25% border, white pills inside.
const cardTone: Record<StatChipVariant, string> = {
  green: "bg-success-bg/80 border-chip-green/20",
  blue: "bg-info-bg/80 border-chip-blue/20",
  purple: "bg-chip-purple-bg/40 border-chip-purple/20",
  red: "bg-danger-bg/80 border-chip-red/20",
};

const iconTone: Record<StatChipVariant, string> = {
  green: "text-chip-green",
  blue: "text-chip-blue",
  purple: "text-chip-purple",
  red: "text-chip-red",
};

/** none = no add action, pencil = icon next to the amount, button = "+ Add ..." button, both = pencil and button. */
export type StatCtaVariant = "none" | "pencil" | "button" | "both";

interface ExpenseStatCardProps {
  item: IExpenseStatItem;
  onView: () => void;
  onExport: () => void;
  ctaLabel?: string;
  onCtaClick?: () => void;
  ctaVariant?: StatCtaVariant;
  /** Disables the add action (pencil and button), e.g. when a limit is reached. */
  ctaDisabled?: boolean;
  /** Tooltip explaining why it is disabled. */
  ctaTitle?: string;
}

export default function ExpenseStatCard({ item, onView, onExport, ctaLabel, onCtaClick, ctaVariant = "both", ctaDisabled = false, ctaTitle }: ExpenseStatCardProps) {
  const Icon = item.icon;
  // 0% = no change (or nothing to compare against): neutral grey, never green/red
  const flat = item.trendPercent === 0;
  // an add action only exists when the caller gave us a handler
  const showPencil = !!onCtaClick && (ctaVariant === "pencil" || ctaVariant === "both");
  const showButton = !!onCtaClick && !!ctaLabel && (ctaVariant === "button" || ctaVariant === "both");

  return (
    <div
      className={cn(
        "flex flex-col gap-brand-8 min-h-[105px] rounded-brand-12 border p-brand-12 cursor-pointer group default-transition hover:shadow-card-hover hover:-translate-y-0.5",
        cardTone[item.chip]
      )}
      onClick={onView}
    >
      <div className="flex items-center justify-between">

        {/* header title & 3dots dropdown */}
        <div className="flex items-center gap-brand-8">
          <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-brand-8 bg-white shadow-card group-hover:scale-110 default-transition", iconTone[item.chip])}>
            <Icon size={14} strokeWidth={2} />
          </span>
          <span className="para-tiny text-text-secondary">{item.title}</span>
        </div>

        {/* 3dots dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="More options"
              onClick={(e) => e.stopPropagation()}
              className="text-text-secondary-muter cursor-pointer default-transition hover:text-text-secondary"
            >
              <MoreHorizontal size={18} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-dropdown w-44 rounded-brand-8 border border-border-clr bg-white p-1 shadow-card-hover"
            >
              <DropdownMenu.Item
                onClick={onView}
                className="flex cursor-pointer items-center gap-2 rounded-brand-8 px-2.5 py-2 para-tiny text-text-secondary outline-none default-transition hover:bg-page-bg"
              >
                <Eye size={14} /> View transactions
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onClick={onExport}
                className="flex cursor-pointer items-center gap-2 rounded-brand-8 px-2.5 py-2 para-tiny text-text-secondary outline-none default-transition hover:bg-page-bg"
              >
                <Download size={14} /> Export CSV
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="flex flex-col justify-between gap-1.25">
        {/* amount (+ pencil) */}
        <div className="flex items-center gap-3">
          <span className="heading-h6 text-sm leading-tight text-text-dark group-hover:text-primary default-transition">
            {item.value}
          </span>
          {showPencil && (
            <button
              type="button"
              aria-label={ctaLabel ?? "Add entry"}
              disabled={ctaDisabled}
              title={ctaTitle}
              onClick={(e) => { e.stopPropagation(); onCtaClick?.(); }}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-primary shadow-card default-transition enabled:hover:bg-primary enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>

        {/* trend & cta */}
        <div className="flex items-center justify-between gap-brand-8">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 para-tiny font-medium",
              flat ? "text-text-secondary-muted" : item.isPositive ? "text-success" : "text-danger"
            )}>
              {flat ? <Minus size={11} /> : item.trendDirection === "up" ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
              {item.trendPercent}%
            </span>

            <span className="para-tiny text-text-secondary-muted">{item.trendLabel}</span>
          </div>

          {showButton && (
            <button
              type="button"
              disabled={ctaDisabled}
              title={ctaTitle}
              onClick={(e) => { e.stopPropagation(); onCtaClick?.(); }}
              className="self-end rounded-brand-8 bg-white px-2 py-1.5 para-tiny font-medium text-primary default-transition enabled:hover:bg-primary enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              + {ctaLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}