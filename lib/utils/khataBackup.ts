// dashboard\lib\utils\khataBackup.ts

import {
    DEBT_CATEGORY_TYPE, PARTY_TYPES,
    type ICard, type ICategory, type IExpenseEntry, type IParty,
} from "@/types/expenseManagerTy";

const APP = "filernow-khata-backup"; // same id and version as the mobile app, so the two can read each other
const VERSION = 1;

export type BackupData = { entries: IExpenseEntry[]; categories: ICategory[]; cards: ICard[]; parties: IParty[] };

export const buildBackup = (data: BackupData) => ({
    app: APP,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    entries: data.entries,
    categories: data.categories,
    cards: data.cards,
    parties: data.parties,
});

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const optStr = (v: unknown) => (typeof v === "string" ? v : undefined);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

const KINDS = ["expense", "income", "debt"] as const;
const COLORS = ["primary", "secondary", "warning", "info", "danger", "neutral"] as const;
const GRADIENTS = ["primary", "secondary", "dark"] as const;

function cleanEntry(raw: unknown): IExpenseEntry | null {
    if (!isObj(raw)) return null;
    if (!str(raw.id) || !str(raw.subject) || !str(raw.date) || !str(raw.categoryId)) return null;
    if (!oneOf(KINDS, raw.kind) || !num(raw.amount) || raw.amount <= 0) return null;
    if (raw.kind === "debt" && !(raw.categoryId in DEBT_CATEGORY_TYPE)) return null; // only known udhaar types
    return {
        id: raw.id,
        kind: raw.kind,
        subject: raw.subject,
        categoryId: raw.categoryId,
        amount: raw.amount,
        date: raw.date,
        time: optStr(raw.time),
        description: optStr(raw.description),
        receiptImage: optStr(raw.receiptImage),
        cardId: optStr(raw.cardId),
        partyId: optStr(raw.partyId),
        createdAt: optStr(raw.createdAt),
    };
}

function cleanCategory(raw: unknown): ICategory | null {
    if (!isObj(raw) || !str(raw.id) || !str(raw.label)) return null;
    if (!oneOf(KINDS, raw.kind) || !oneOf(COLORS, raw.color)) return null;
    return { id: raw.id, label: raw.label, kind: raw.kind, color: raw.color };
}

function cleanCard(raw: unknown): ICard | null {
    if (!isObj(raw) || !str(raw.id) || !str(raw.label) || !str(raw.last4)) return null;
    if (!num(raw.balance) || !num(raw.expiryMonth) || !num(raw.expiryYear) || !oneOf(GRADIENTS, raw.gradient)) return null;
    return {
        id: raw.id,
        label: raw.label,
        balance: raw.balance,
        last4: raw.last4,
        expiryMonth: raw.expiryMonth,
        expiryYear: raw.expiryYear,
        gradient: raw.gradient,
    };
}

function cleanParty(raw: unknown): IParty | null {
    if (!isObj(raw) || !str(raw.id) || !str(raw.name) || !str(raw.createdAt) || !oneOf(PARTY_TYPES, raw.type)) return null;
    return {
        id: raw.id,
        slug: str(raw.slug) ? raw.slug : raw.id,
        name: raw.name,
        phone: optStr(raw.phone),
        type: raw.type,
        createdAt: raw.createdAt,
        reminderDate: optStr(raw.reminderDate),
    };
}

const list = <T,>(raw: unknown, clean: (r: unknown) => T | null): T[] =>
    Array.isArray(raw) ? raw.map(clean).filter((x): x is T => x !== null) : [];

/** Returns the cleaned backup, or null when the text is not a Khata backup. Bad rows are skipped, never trusted. */
export function parseBackup(text: string): BackupData | null {
    try {
        const raw: unknown = JSON.parse(text);
        if (!isObj(raw) || raw.app !== APP || !num(raw.version) || raw.version > VERSION) return null;
        if (!Array.isArray(raw.entries) || !Array.isArray(raw.parties)) return null;
        return {
            entries: list(raw.entries, cleanEntry),
            categories: list(raw.categories, cleanCategory), // a mobile backup has none: that is fine
            cards: list(raw.cards, cleanCard),
            parties: list(raw.parties, cleanParty),
        };
    } catch {
        return null;
    }
}