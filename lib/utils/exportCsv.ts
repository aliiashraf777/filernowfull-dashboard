// dashboard\lib\utils\exportCsv.ts

import { IExpenseEntry, ICategory } from "@/types/expenseManagerTy";
import { csvCell, csvSafe } from "./csv";

export function exportEntriesToCsv(entries: IExpenseEntry[], categories: ICategory[], filename: string) {
    const label = (id: string) => categories.find((c) => c.id === id)?.label ?? "Uncategorized";
    const header = ["Date", "Type", "Subject", "Category", "Amount"];
    const rows = entries.map((e) => [e.date, e.kind, csvSafe(e.subject), csvSafe(label(e.categoryId)), e.amount]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // BOM so Excel reads UTF-8
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}