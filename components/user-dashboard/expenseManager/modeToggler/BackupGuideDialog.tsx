// dashboard\components\user-dashboard\expenseManager\modeToggler\BackupGuideDialog.tsx

"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { HelpCircle, X } from "lucide-react";

const STEPS = [
    { title: "1. Back up", text: "Click Backup and keep the file somewhere safe: Google Drive, email, or a USB drive." },
    { title: "2. New computer or cleared browser", text: "Open this page there, click Restore, and pick the file you saved." },
    { title: "3. Nothing is lost or doubled", text: "Restore only adds what is missing. It never deletes or replaces what you already have, so restoring twice is safe." },
    { title: "4. Phone and computer", text: "The same file works in the mobile app. A phone backup carries Udhaar and parties; the web backup carries everything." },
];

/** Plain-language explanation of Backup & Restore. */
export default function BackupGuideDialog() {
    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <button
                    type="button"
                    aria-label="How does backup work?"
                    title="How does backup work?"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border-clr bg-white text-primary default-transition hover:bg-page-bg"
                >
                    <HelpCircle size={15} />
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-modal bg-black/40" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-modal max-h-[85vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-brand-16 bg-white p-brand shadow-card-hover">
                    <div className="mb-brand-8 flex items-center justify-between">
                        <Dialog.Title className="heading-h6 text-text-dark">Backup &amp; Restore</Dialog.Title>
                        <Dialog.Close aria-label="Close" className="cursor-pointer text-text-secondary-muter hover:text-text-secondary">
                            <X size={16} />
                        </Dialog.Close>
                    </div>
                    <Dialog.Description className="mb-brand-12 para-tiny text-text-secondary">
                        A backup is a small copy of your khata in one file, like a photo of your notebook. Your data lives in this browser only, so keep a copy.
                    </Dialog.Description>
                    <div className="flex flex-col gap-brand-8">
                        {STEPS.map((s) => (
                            <div key={s.title} className="rounded-brand-8 border border-border-clr p-brand-12">
                                <p className="para-tiny font-semibold text-text-dark">{s.title}</p>
                                <p className="mt-1 para-tiny text-text-secondary">{s.text}</p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-brand-12 para-tiny text-text-secondary-muted">Demo data is only for practice, so it is never backed up.</p>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}