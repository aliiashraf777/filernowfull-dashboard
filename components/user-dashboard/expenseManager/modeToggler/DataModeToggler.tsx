// dashboard\components\user-dashboard\expenseManager\modeToggler\DataModeToggler.tsx

"use client";
import { useRef, useState } from "react";
import { Download, RotateCcw, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { useExpenseManagerStore } from "@/hooks/useExpenseManagerStore";
import { buildBackup, parseBackup } from "@/lib/utils/khataBackup";
import { downloadBlob } from "@/lib/utils/exportKit";

export default function DataModeToggler() {
    const store = useExpenseManagerStore();
    const fileRef = useRef<HTMLInputElement>(null);
    const [confirm, setConfirm] = useState(false);
    const isDemo = store.dataMode === "demo";
    const Icon = isDemo ? RotateCcw : Sparkles;

    const apply = () => {
        (isDemo ? store.resetToBlank : store.loadDemoData)();
        setConfirm(false);
    };

    const backUp = () => {
        const book = store.liveBook;
        if (book.entries.length + book.cards.length + book.parties.length === 0) {
            toast("Backup ke liye abhi kuch nahi");
            return;
        }
        const stamp = new Date().toISOString().slice(0, 10);
        downloadBlob(new Blob([JSON.stringify(buildBackup(book))], { type: "application/json" }), `khata-backup-${stamp}.json`);
    };

    const restore = async (file: File) => {
        try {
            const parsed = parseBackup(await file.text());
            if (!parsed) {
                toast.error("Ye Khata backup file sahi nahi hai");
                return;
            }
            const added = store.restoreBackup(parsed);
            if (added.entries + added.cards + added.parties === 0) toast("Is backup mein kuch naya nahi");
            else toast.success(`Restore ho gaya: ${added.entries} entries, ${added.cards} cards, ${added.parties} parties`);
        } catch {
            toast.error("Ye Khata backup file sahi nahi hai");
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-border-clr bg-white px-2.5 py-1.5 para-tiny text-text-secondary">
                {/* demo: faster orange blink (practice data); live: slow green pulse; still if the user asked for less motion */}
                <span
                    aria-hidden
                    className={cn("h-1.5 w-1.5 rounded-full motion-safe:animate-pulse", isDemo ? "bg-warning" : "bg-success")}
                    style={{ animationDuration: isDemo ? "800ms" : "1600ms" }}
                />
                Mode: {isDemo ? "Demo" : "Live"}
            </span>

            {confirm ? (
                <div className="flex items-center gap-1.5">
                    <span className="para-tiny text-text-secondary-muted">
                        {isDemo
                            ? "Demo data aur us ki tabdeeliyan delete hongi. Aap ka asli khata wapas aa jayega. Pakka?"
                            : "Demo data aap ke khata ki jagah dikhaya jayega. Aap ka asli data nahi badlega. Jari rakhein?"}
                    </span>
                    <button type="button" onClick={apply}
                        className="cursor-pointer rounded-brand-8 bg-danger px-2 py-1.5 para-tiny font-semibold text-white">Haan</button>
                    <button type="button" onClick={() => setConfirm(false)}
                        className="cursor-pointer rounded-brand-8 border border-border-clr px-2 py-1.5 para-tiny font-semibold text-text-secondary">Nahi</button>
                </div>
            ) : (
                <button type="button" onClick={() => setConfirm(true)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-brand-8 border border-border-clr bg-white px-2.5 py-2 para-tiny font-semibold text-text-secondary default-transition hover:bg-page-bg">
                    <Icon size={13} /> {isDemo ? "Exit Demo" : "Load Demo Data"}
                </button>
            )}

            {!isDemo && (
                <>
                    <button type="button" onClick={backUp} title="Data sirf is browser mein save hai: backup lein"
                        className="flex cursor-pointer items-center gap-1.5 rounded-brand-8 border border-border-clr bg-white px-2.5 py-2 para-tiny font-semibold text-text-secondary default-transition hover:bg-page-bg">
                        <Download size={13} /> Backup
                    </button>
                    <button type="button" onClick={() => fileRef.current?.click()}
                        className="flex cursor-pointer items-center gap-1.5 rounded-brand-8 border border-border-clr bg-white px-2.5 py-2 para-tiny font-semibold text-text-secondary default-transition hover:bg-page-bg">
                        <Upload size={13} /> Restore
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = ""; // lets the same file be picked again
                            if (file) void restore(file);
                        }}
                    />
                </>
            )}
        </div>
    );
}