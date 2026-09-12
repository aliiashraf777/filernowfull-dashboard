// app/user-dashboard/expense-manager/page.tsx
"use client";

import { useState } from "react";
import ExpensesStatsCard from "@/components/user-dashboard/expenseManager/ExpensesStatsCard";
import ExpensesTable from "@/components/user-dashboard/expenseManager/ExpensesTable";
import MonthlyTrendChart from "@/components/user-dashboard/expenseManager/MonthlyTrendChart";
import CategoryBreakdown from "@/components/user-dashboard/expenseManager/CategoryBreakdown";
import DebtSummaryCard from "@/components/user-dashboard/expenseManager/DebtSummaryCard";
import NewExpenseDialog from "@/components/user-dashboard/expenseManager/NewExpenseDialog";
import CategoryManagerDialog from "@/components/user-dashboard/expenseManager/CategoryManagerDialog";
import { useExpenseManagerStore } from "@/lib/store/useExpenseManagerStore";
import { IExpenseEntry } from "@/types/expenseManager";

export default function ExpenseManagerPage() {
    const store = useExpenseManagerStore();
    const [editingEntry, setEditingEntry] = useState<IExpenseEntry | null>(null);

    const debtEntries = store.entries.filter((e) => e.kind === "debt" && !e.isSettled);

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-border-clr pb-3">
                <h1 className="heading-h4 text-text-dark">Expense Manager</h1>
                <div className="flex items-center gap-3">
                    <CategoryManagerDialog
                        categories={store.categories}
                        onAdd={store.addCategory}
                        onDelete={store.deleteCategory}
                    />
                    <NewExpenseDialog
                        categories={store.categories}
                        onSaved={(values) => store.addEntry(values)}
                    />
                </div>
            </div>

            <ExpensesStatsCard />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <ExpensesTable
                        entries={store.entries}
                        categories={store.categories}
                        sortField={store.sortField}
                        sortDirection={store.sortDirection}
                        onSort={(field) => {
                            if (field === store.sortField) {
                                store.setSortDirection(store.sortDirection === "asc" ? "desc" : "asc");
                            } else {
                                store.setSortField(field);
                                store.setSortDirection("desc");
                            }
                        }}
                        onDelete={store.deleteEntry}
                        onEdit={setEditingEntry}
                    />
                </div>
                <DebtSummaryCard totalDebt={store.stats.totalDebt} debtCount={debtEntries.length} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <MonthlyTrendChart data={store.stats.dailyTrend} />
                <MonthlyTrendChart data={store.stats.dailyTrend} />
            </div>

            <CategoryBreakdown /> {/* wire to store.stats.categoryBreakdown instead of static import */}
        </div>
    );
}