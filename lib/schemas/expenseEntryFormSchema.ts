// lib/schemas/expenseEntryFormSchema.ts
import { z } from "zod";

export const expenseEntryFormValuesSchema = z.object({
  kind: z.enum(["expense", "income", "debt"]),
  subject: z.string().min(2, "Subject is required"),
  categoryId: z.string().min(1, "Category is required"),
  amount: z.number().positive("Enter an amount greater than 0"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  isSettled: z.boolean().optional(),
  // File objects aren't validated by Zod meaningfully here, kept optional
  // and handled outside the resolver, same reasoning as your `z.coerce`
  // avoidance: don't force a schema library to do a DOM-boundary job.
});

export type ExpenseEntryFormValues = z.infer<typeof expenseEntryFormValuesSchema>;