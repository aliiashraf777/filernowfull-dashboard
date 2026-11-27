// dashboard\lib\utils\exportTransactionsData.ts

import * as XLSX from "xlsx";
import autoTable from "jspdf-autotable";
import { IExpenseEntry, ICategory, IParty } from "@/types/expenseManagerTy";
import { cashFlow, debtBalances, debtTotals, pkr } from "./debt";
import { csvCell, csvSafe } from "./csv";
import { BRAND, GREEN, INK, addFooters, downloadBlob, startPdf, summaryBoxes } from "./exportKit";

const HEADER = ["Date", "Type", "Party", "Subject", "Category", "Amount"];

// Udhaar-only exports (every row is debt) get Get/Give totals instead of Income/Expense.
const isUdhaar = (entries: IExpenseEntry[]) => entries.length > 0 && entries.every((e) => e.kind === "debt");

function rows(entries: IExpenseEntry[], categories: ICategory[], parties: IParty[]): (string | number)[][] {
  const cat = (id: string) => categories.find((c) => c.id === id)?.label ?? "Uncategorized";
  const party = (id?: string) => parties.find((p) => p.id === id)?.name ?? "";
  return entries.map((e) => [e.date, e.kind, party(e.partyId), e.subject, cat(e.categoryId), e.amount]);
}

export function exportToCsv(entries: IExpenseEntry[], categories: ICategory[], filename: string, parties: IParty[] = []) {
  const safe = (v: string | number) => (typeof v === "string" ? csvSafe(v) : v);
  const lines = [HEADER, ...rows(entries, categories, parties).map((r) => r.map(safe))].map((r) => r.map(csvCell).join(","));
  downloadBlob(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" }), filename);
}

export function exportToXlsx(entries: IExpenseEntry[], categories: ICategory[], filename: string, parties: IParty[] = []) {
  const ws = XLSX.utils.aoa_to_sheet([HEADER, ...rows(entries, categories, parties)]);
  ws["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(wb, filename);
}

// "+Rs 5,000" money in, "-Rs 5,000" money out, no sign when no cash moves (forgiven udhaar)
const signed = (e: IExpenseEntry) => {
  const flow = cashFlow(e);
  return `${flow > 0 ? "+" : flow < 0 ? "-" : ""}${pkr(e.amount)}`;
};

export function exportToPdf(entries: IExpenseEntry[], categories: ICategory[], filename: string, parties: IParty[] = []) {
  const udhaar = isUdhaar(entries);
  const sum = (k: string) => entries.filter((e) => e.kind === k).reduce((s, e) => s + e.amount, 0);

  let boxes;
  if (udhaar) {
    // gave = red, got = green: "You will get" is money you gave out
    const { youWillGet, youWillGive } = debtTotals(debtBalances(entries));
    boxes = [
      { label: "YOU WILL GET", value: pkr(youWillGet), color: BRAND },
      { label: "YOU WILL GIVE", value: pkr(youWillGive), color: GREEN },
      { label: "NET", value: pkr(youWillGet - youWillGive) },
    ];
  } else {
    const income = sum("income"), expense = sum("expense");
    boxes = [
      { label: "TOTAL INCOME", value: pkr(income), color: GREEN },
      { label: "TOTAL EXPENSE", value: pkr(expense), color: BRAND },
      { label: "NET", value: pkr(income - expense) },
    ];
  }

  const note = !udhaar && entries.some((e) => e.kind === "debt") ? " · Udhaar entries are listed but not counted in the totals" : "";
  const doc = startPdf(udhaar ? "Udhaar Report" : "Transactions Report", `${entries.length} entries${note}`);
  const y = summaryBoxes(doc, 90, boxes);
  autoTable(doc, {
    startY: y + 16,
    head: [HEADER],
    body: rows(entries, categories, parties).map((r, i) => r.map((v, c) => (c === 5 ? signed(entries[i]) : String(v)))),
    theme: "striped",
    margin: { left: 40, right: 40, bottom: 50 },
    styles: { fontSize: 8.5, cellPadding: 5, textColor: INK },
    headStyles: { fillColor: INK, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 5: { halign: "right", fontStyle: "bold" } },
    didParseCell: (d) => {
      if (d.column.index !== 5) return;
      if (d.section === "head") { d.cell.styles.halign = "right"; return; }
      if (d.section === "body") {
        const e = entries[d.row.index];
        const flow = e ? cashFlow(e) : 0;
        d.cell.styles.textColor = flow > 0 ? GREEN : flow < 0 ? BRAND : INK;
      }
    },
  });
  addFooters(doc).save(filename);
}