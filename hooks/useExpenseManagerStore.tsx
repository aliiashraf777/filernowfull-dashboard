// dashboard\hooks\useExpenseManagerStore.tsx

"use client";

import { useState, useMemo, useCallback, useEffect, useContext, createContext, ReactNode } from "react";
import {
  IExpenseEntry, ICategory, SortField, SortDirection, ICard, IParty, PARTY_TYPES, EntryKind, MAX_CARDS,
} from "@/types/expenseManagerTy";
import { defaultCategories } from "@/data/user-dashboard/defaultCategoriesData";
import { dummyExpenseEntries, dummyParties } from "@/data/user-dashboard/dummyExpenseEntries";
import { dummyCards } from "@/data/user-dashboard/dummyCards";
import { buildDemoEntries } from "@/lib/utils/demoHistory";
import type { BackupData } from "@/lib/utils/khataBackup";
import { buildTrend, weekKey } from "@/lib/utils/trend";
import { toast } from "sonner";
import { cardDelta } from "@/lib/utils/cardDelta";
import { PartyFormValues } from "@/lib/schemas/partySchema";
import { debtBalances, debtTotals } from "@/lib/utils/debt";
import { makeSlug } from "@/lib/utils/party";

// Bump ONLY this one line when IExpenseEntry/ICategory/ICard fields are
// RENAMED or REMOVED. Adding a new OPTIONAL field does NOT require a bump —
// old stored JSON simply parses with that field undefined, which is valid.
const SCHEMA_VERSION = "v3";
const STORAGE_KEY_ENTRIES = `filernow_expense_entries_${SCHEMA_VERSION}`;
const STORAGE_KEY_CATEGORIES = `filernow_expense_categories_${SCHEMA_VERSION}`;
const STORAGE_KEY_CARDS = `filernow_expense_cards_${SCHEMA_VERSION}`;
const STORAGE_KEY_MODE = `filernow_khata_mode_${SCHEMA_VERSION}`; // plain text: "demo" | "blank"
const STORAGE_KEY_PARTIES = `filernow_expense_parties_${SCHEMA_VERSION}`;
// the practice copy lives under its own key, so it can never overwrite the real data above
const STORAGE_KEY_DEMO = `filernow_khata_demo_${SCHEMA_VERSION}`;

// Safety net for teammates who forget to bump: if stored entries don't match
// the current required shape (e.g. still using old `category` instead of
// `categoryId`), auto-reseed instead of silently rendering broken/empty data.
function isValidEntry(e: any): e is IExpenseEntry {
  return e &&
    typeof e.id === "string" &&
    typeof e.kind === "string" &&
    typeof e.categoryId === "string" &&
    typeof e.amount === "number" &&
    typeof e.date === "string";
}

function readLocalT<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Storage can be full or blocked: keep working in memory instead of crashing.
function save(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

type DataMode = "demo" | "blank";

/** Everything the khata shows for one mode. "blank" is the user's real khata, "demo" a practice copy. */
type Book = { entries: IExpenseEntry[]; categories: ICategory[]; cards: ICard[]; parties: IParty[] };
const EMPTY_BOOK: Book = { entries: [], categories: defaultCategories, cards: [], parties: [] };

/** Turns whatever was stored into a safe Book (bad data falls back to empty instead of breaking the page). */
function sanitizeBook(raw: { entries?: unknown; categories?: unknown; cards?: unknown; parties?: unknown }): Book {
  const entries = Array.isArray(raw.entries) && raw.entries.every(isValidEntry) ? (raw.entries as IExpenseEntry[]) : [];
  const cards = Array.isArray(raw.cards) ? (raw.cards as ICard[]) : [];
  const parties = (Array.isArray(raw.parties) ? (raw.parties as IParty[]) : []).map((p) => ({
    ...p,
    slug: p.slug ?? makeSlug(p.name),
    type: (PARTY_TYPES as readonly string[]).includes(p.type) ? p.type : "customer",
  }));
  const categories =
    Array.isArray(raw.categories) && raw.categories.every((c: Partial<ICategory>) => typeof c?.kind === "string")
      ? (raw.categories as ICategory[])
      : defaultCategories;
  return { entries, categories, cards, parties };
}

const createDemoBook = (): Book => ({
  entries: buildDemoEntries(dummyExpenseEntries, dummyParties),
  categories: defaultCategories.map((c) => ({ ...c })),
  cards: dummyCards.map((c) => ({ ...c })),
  parties: dummyParties.map((p) => ({ ...p })),
});

function useExpenseManagerState() {
  const [books, setBooks] = useState<Record<DataMode, Book>>({ blank: EMPTY_BOOK, demo: EMPTY_BOOK });
  const [dataMode, setDataMode] = useState<DataMode>("blank");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [hasLoaded, setHasLoaded] = useState(false);

  // The book the screens see and every action edits.
  const book = books[dataMode];
  const { entries, categories, cards, parties } = book;

  /** The ONE place that edits data: changes the active book only, so demo and real data never mix. */
  const updateBook = useCallback(
    (patch: (b: Book) => Partial<Book>) => {
      setBooks((prev) => ({ ...prev, [dataMode]: { ...prev[dataMode], ...patch(prev[dataMode]) } }));
    },
    [dataMode],
  );

  useEffect(() => {
    // The mode was saved as plain text but older code read it as JSON, so it was never restored.
    const rawMode = window.localStorage.getItem(STORAGE_KEY_MODE)?.replace(/"/g, "");
    const savedMode: DataMode = rawMode === "demo" ? "demo" : "blank";

    const stored = sanitizeBook({
      entries: readLocalT<unknown>(STORAGE_KEY_ENTRIES, []),
      categories: readLocalT<unknown>(STORAGE_KEY_CATEGORIES, defaultCategories),
      cards: readLocalT<unknown>(STORAGE_KEY_CARDS, []),
      parties: readLocalT<unknown>(STORAGE_KEY_PARTIES, []),
    });
    const storedDemo = readLocalT<Partial<Book> | null>(STORAGE_KEY_DEMO, null);

    let blank = stored;
    let demo = EMPTY_BOOK;
    if (storedDemo) {
      demo = sanitizeBook(storedDemo);
    } else if (savedMode === "demo") {
      // Older versions kept demo data in the main keys: that is demo data, not the user's. Move it over.
      demo = stored;
      blank = EMPTY_BOOK;
    }
    const demoHasData = demo.entries.length + demo.cards.length + demo.parties.length > 0;

    setBooks({ blank, demo });
    setDataMode(savedMode === "demo" && demoHasData ? "demo" : "blank");
    setHasLoaded(true);
  }, []);

  // Guarded: never persist before the load-effect has actually run, so we
  // can't repeat the "write [] over real data on first paint" bug.
  useEffect(() => {
    if (!hasLoaded) return;
    const b = books.blank;
    save(STORAGE_KEY_ENTRIES, JSON.stringify(b.entries));
    save(STORAGE_KEY_CATEGORIES, JSON.stringify(b.categories));
    save(STORAGE_KEY_CARDS, JSON.stringify(b.cards));
    save(STORAGE_KEY_PARTIES, JSON.stringify(b.parties));
  }, [books.blank, hasLoaded]);

  useEffect(() => {
    if (!hasLoaded) return;
    if (books.demo === EMPTY_BOOK) {
      try {
        window.localStorage.removeItem(STORAGE_KEY_DEMO);
      } catch {
        /* ignore */
      }
    } else {
      save(STORAGE_KEY_DEMO, JSON.stringify(books.demo));
    }
  }, [books.demo, hasLoaded]);

  useEffect(() => {
    if (!hasLoaded) return;
    save(STORAGE_KEY_MODE, dataMode);
  }, [dataMode, hasLoaded]);

  const loadDemoData = useCallback(() => {
    setBooks((prev) => ({ ...prev, demo: createDemoBook() }));
    setDataMode("demo");
    toast.success("Demo data load ho gaya");
  }, []);

  // Leaves demo mode and drops the practice copy. The real khata is untouched.
  const resetToBlank = useCallback(() => {
    setBooks((prev) => ({ ...prev, demo: EMPTY_BOOK }));
    setDataMode("blank");
    toast.success("Demo data hata diya gaya. Aap ka asli khata wapas aa gaya");
  }, []);

  // Adds what a backup has and the real khata doesn't (matched by id). Never deletes or overwrites anything.
  const restoreBackup = useCallback((backup: BackupData) => {
    if (dataMode === "demo") return { entries: 0, cards: 0, parties: 0 }; // demo is a practice copy: never restore into it
    const live = books.blank;
    const fresh = <T extends { id: string }>(have: T[], incoming: T[]) => {
      const ids = new Set(have.map((x) => x.id));
      return incoming.filter((x) => !ids.has(x.id));
    };
    // counted here, outside the state updater, so the toast can use them right away
    const entries = fresh(live.entries, backup.entries);
    const cards = fresh(live.cards, backup.cards);
    const parties = fresh(live.parties, backup.parties);
    const categories = fresh(live.categories, backup.categories);
    if (entries.length + cards.length + parties.length + categories.length > 0) {
      setBooks((prev) => ({
        ...prev,
        blank: {
          entries: [...entries, ...prev.blank.entries],
          cards: [...prev.blank.cards, ...cards],
          parties: [...parties, ...prev.blank.parties],
          categories: [...prev.blank.categories, ...categories],
        },
      }));
    }
    return { entries: entries.length, cards: cards.length, parties: parties.length };
  }, [dataMode, books.blank]);

  // ONE place that changes card balances + shows the separate balance toast.
  const applyCardDeltas = useCallback((deltas: Record<string, number>) => {
    const touched = Object.entries(deltas).filter(([, d]) => d !== 0);
    if (touched.length === 0) return;

    updateBook((b) => ({
      cards: b.cards.map((c) => (deltas[c.id] ? { ...c, balance: c.balance + deltas[c.id] } : c)),
    }));

    touched.forEach(([id, d]) => {
      const card = cards.find((c) => c.id === id);
      if (card) {
        toast.success(
          `${card.label}: ${d > 0 ? "+" : "-"}PKR ${Math.abs(d).toLocaleString("en-PK")} (naya balance PKR ${(card.balance + d).toLocaleString("en-PK")})`
        );
      }
    });
  }, [updateBook, cards]);

  const addEntry = useCallback((entry: Omit<IExpenseEntry, "id">) => {
    const clean = entry.kind === "debt"
      ? { ...entry, cardId: undefined }
      : entry;

    updateBook((b) => ({
      entries: [{ ...clean, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...b.entries],
    }));

    toast.success(`${entry.subject} save ho gaya`);

    if (clean.cardId) {
      applyCardDeltas({ [clean.cardId]: cardDelta(clean) });
    }
  }, [updateBook, applyCardDeltas]);

  const updateEntry = useCallback((id: string, patch: Partial<IExpenseEntry>) => {
    const old = entries.find((e) => e.id === id);
    if (!old) return;

    const updated = { ...old, ...patch };
    updateBook((b) => ({ entries: b.entries.map((e) => (e.id === id ? updated : e)) }));
    toast.success(`${updated.subject} update ho gaya`);

    // Debt card effects are ledger-style (applied at creation + each payment),
    // never re-computed on edit. Income/expense are reconciled here.
    if (updated.kind !== "debt") {
      const deltas: Record<string, number> = {};

      if (old.cardId) {
        deltas[old.cardId] = (deltas[old.cardId] ?? 0) - cardDelta(old);
      }
      if (updated.cardId) {
        deltas[updated.cardId] = (deltas[updated.cardId] ?? 0) + cardDelta(updated);
      }

      applyCardDeltas(deltas);
    }
  }, [entries, updateBook, applyCardDeltas]);

  const deleteEntry = useCallback((id: string) => {
    const target = entries.find((e) => e.id === id);
    if (!target) return;

    updateBook((b) => ({ entries: b.entries.filter((e) => e.id !== id) }));
    toast.success(`${target.subject} delete ho gaya`);

    if (target.cardId && target.kind !== "debt") {
      applyCardDeltas({ [target.cardId]: -cardDelta(target) });
    }
  }, [entries, updateBook, applyCardDeltas]);

  const addParty = useCallback((p: PartyFormValues): IParty => {
    const party: IParty = { ...p, id: crypto.randomUUID(), slug: makeSlug(p.name), createdAt: new Date().toISOString() };
    updateBook((b) => ({ parties: [party, ...b.parties] }));
    toast.success(`${party.name} add ho gaya`);
    return party; // lets the entry dialog select it immediately
  }, [updateBook]);

  const addParties = useCallback((list: PartyFormValues[]): number => {
    const now = new Date().toISOString();
    const created: IParty[] = list.map((p) => ({ ...p, id: crypto.randomUUID(), slug: makeSlug(p.name), createdAt: now }));
    updateBook((b) => ({ parties: [...created, ...b.parties] }));
    toast.success(`${created.length} parties add ho gayin`);
    return created.length;
  }, [updateBook]);

  const updateParty = useCallback((id: string, patch: Partial<IParty>) => {
    updateBook((b) => ({ parties: b.parties.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, [updateBook]);

  const deleteParty = useCallback((id: string, withEntries = false): boolean => {
    const linked = entries.filter((e) => e.partyId === id);
    if (linked.length && !withEntries) {
      toast.error("Is party ki entries maujood hain, pehle woh delete karein");
      return false;
    }
    if (linked.length) {
      // undo card balance effects of linked income/expense entries (debt never touches cards)
      const deltas: Record<string, number> = {};
      linked.forEach((e) => {
        if (e.kind !== "debt" && e.cardId) deltas[e.cardId] = (deltas[e.cardId] ?? 0) - cardDelta(e);
      });
      applyCardDeltas(deltas);
    }
    updateBook((b) => ({
      entries: b.entries.filter((e) => e.partyId !== id),
      parties: b.parties.filter((p) => p.id !== id),
    }));
    toast.success(linked.length ? `Party aur ${linked.length} entries delete ho gayin` : "Party delete ho gayi");
    return true;
  }, [entries, updateBook, applyCardDeltas]);

  const addCategory = useCallback((label: string, color: ICategory["color"], kind: EntryKind) => {
    const clean = label.trim();

    if (categories.some((c) => c.kind === kind && c.label.toLowerCase() === clean.toLowerCase())) {
      toast.error(`"${clean}" pehle se maujood hai`);
      return;
    }

    updateBook((b) => ({ categories: [...b.categories, { id: crypto.randomUUID(), label: clean, color, kind }] }));
    toast.success(`${clean} category add ho gayi`);
  }, [categories, updateBook]);

  const updateCategory = useCallback((id: string, patch: Partial<ICategory>) => {
    updateBook((b) => ({ categories: b.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, [updateBook]);

  const deleteCategory = useCallback((id: string) => {
    const target = categories.find((c) => c.id === id);
    if (!target) return;

    if (target.kind === "debt") {
      toast.error("Udhaar categories delete nahi ho sakti");
      return;
    }

    const fallback = categories.find((c) => c.kind === target.kind && c.label === "Other" && c.id !== id);
    if (!fallback) {
      toast.error(`"Other" category delete nahi ho sakti`);
      return;
    }

    updateBook((b) => ({
      entries: b.entries.map((e) => (e.categoryId === id ? { ...e, categoryId: fallback.id } : e)),
      categories: b.categories.filter((c) => c.id !== id),
    }));
    toast.success(`${target.label} delete ho gayi (entries "Other" me chali gayin)`);
  }, [categories, updateBook]);

  const addCard = useCallback((card: Omit<ICard, "id">) => {
    if (cards.length >= MAX_CARDS) {
      toast.error(`Sirf ${MAX_CARDS} cards add ho sakte hain`);
      return;
    }

    updateBook((b) => ({ cards: [...b.cards, { ...card, id: crypto.randomUUID() }] }));
    toast.success(`${card.label} add ho gaya`);
  }, [cards.length, updateBook]);

  const updateCard = useCallback((id: string, patch: Partial<ICard>) => {
    updateBook((b) => ({ cards: b.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    toast.success("Card update ho gaya");
  }, [updateBook]);

  const deleteCard = useCallback((id: string) => {
    const target = cards.find((c) => c.id === id);

    updateBook((b) => ({
      cards: b.cards.filter((c) => c.id !== id),
      entries: b.entries.map((e) => (e.cardId === id ? { ...e, cardId: undefined } : e)),
    }));

    if (target) {
      toast.success(`${target.label} delete ho gaya`);
    }
  }, [cards, updateBook]);

  const adjustCardBalance = useCallback((id: string, delta: number) => {
    updateBook((b) => ({ cards: b.cards.map((c) => (c.id === id ? { ...c, balance: c.balance + delta } : c)) }));
  }, [updateBook]);

  const transferBetweenCards = useCallback((fromId: string, toId: string, amount: number) => {
    const from = cards.find((c) => c.id === fromId);
    const to = cards.find((c) => c.id === toId);

    if (!from || !to || fromId === toId || amount <= 0) {
      toast.error("Alag alag cards chunein");
      return;
    }

    if (from.balance < amount) {
      toast.error(`${from.label} me itna balance nahi hai`);
      return;
    }

    updateBook((b) => ({
      cards: b.cards.map((c) => {
        if (c.id === fromId) return { ...c, balance: c.balance - amount };
        if (c.id === toId) return { ...c, balance: c.balance + amount };
        return c;
      }),
    }));

    toast.success(`PKR ${amount.toLocaleString("en-PK")} ${from.label} se ${to.label} me transfer hue`);
  }, [cards, updateBook]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      let cmp = 0;

      if (sortField === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortField === "amount") {
        cmp = a.amount - b.amount;
      }
      if (sortField === "subject") {
        cmp = a.subject.localeCompare(b.subject);
      }

      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [entries, sortField, sortDirection]);

  const stats = useMemo(() => {
    const totalIncome = entries
      .filter((e) => e.kind === "income")
      .reduce((s, e) => s + e.amount, 0);

    const totalExpenses = entries
      .filter((e) => e.kind === "expense")
      .reduce((s, e) => s + e.amount, 0);

    const debtNet = debtBalances(entries);
    const { youWillGet, youWillGive } = debtTotals(debtNet);

    const balance = totalIncome - totalExpenses;
    const weeklyTrend = buildTrend(entries, weekKey, 8);

    const categoryTotals = categories
      .map((cat) => {
        const amount = entries
          .filter((e) => e.categoryId === cat.id && e.kind === "expense")
          .reduce((s, e) => s + e.amount, 0);
        return { category: cat, amount };
      })
      .filter((c) => c.amount > 0);

    const totalCategorized = categoryTotals.reduce((s, c) => s + c.amount, 0);

    const categoryBreakdown = categoryTotals.map((c) => ({
      ...c,
      percentOfTotal: totalCategorized > 0 ? Math.round((c.amount / totalCategorized) * 100) : 0,
    }));

    const dailyTrend = buildTrend(entries, (d) => d.slice(0, 10), 7);
    const monthlyTrend = buildTrend(entries, (d) => d.slice(0, 7), 6);

    return {
      totalIncome,
      totalExpenses,
      debtNet,
      youWillGet,
      youWillGive,
      balance,
      categoryBreakdown,
      dailyTrend,
      weeklyTrend,
      monthlyTrend
    };
  }, [entries, categories]);

  return {
    entries: sortedEntries,
    categories,
    stats,
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
    addEntry,
    updateEntry,
    deleteEntry,
    hasLoaded, parties, addParty, addParties, updateParty, deleteParty,
    addCategory,
    updateCategory,
    deleteCategory,
    cards, addCard, updateCard, deleteCard, adjustCardBalance, transferBetweenCards,
    dataMode, loadDemoData, resetToBlank, liveBook: books.blank, restoreBackup,
  };
}

type Store = ReturnType<typeof useExpenseManagerState>;
const StoreContext = createContext<Store | null>(null);

export function ExpenseManagerProvider({ children }: { children: ReactNode }) {
  const store = useExpenseManagerState(); // the ONLY place the state lives
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useExpenseManagerStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useExpenseManagerStore must be used inside <ExpenseManagerProvider>");
  return store;
}