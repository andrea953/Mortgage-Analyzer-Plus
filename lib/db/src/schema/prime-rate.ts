import { pgTable, serial, real, date, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const primeRateReadingsTable = pgTable("prime_rate_readings", {
  id: serial("id").primaryKey(),
  observedDate: date("observed_date", { mode: "string" }).notNull().unique(),
  primeRatePct: real("prime_rate_pct").notNull(),
  source: text("source").notNull().default("Bank of Canada Valet V80691311"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPrimeRateReadingSchema = createInsertSchema(
  primeRateReadingsTable,
).omit({ id: true, fetchedAt: true });
export type InsertPrimeRateReading = z.infer<typeof insertPrimeRateReadingSchema>;
export type PrimeRateReading = typeof primeRateReadingsTable.$inferSelect;
