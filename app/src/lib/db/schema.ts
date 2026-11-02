import { pgTable, text, integer, doublePrecision, timestamp, jsonb } from "drizzle-orm/pg-core";

export const subscribers = pgTable("subscribers", {
  id: text("id").primaryKey(), // PayPal subscription id
  email: text("email"),
  name: text("name"),
  planId: text("plan_id"),
  planName: text("plan_name"),
  priceMonthly: doublePrecision("price_monthly").notNull().default(29),
  status: text("status").notNull().default("UNKNOWN"),
  startTime: timestamp("start_time", { withTimezone: true }),
  lastPaymentAt: timestamp("last_payment_at", { withTimezone: true }),
  nextBillingAt: timestamp("next_billing_at", { withTimezone: true }),
  failedPayments: integer("failed_payments").notNull().default(0),
  customId: text("custom_id"),
  source: text("source").notNull().default("paypal"), // paypal | simulator | store
  risk: text("risk").notNull().default("healthy"), // healthy | at_risk | pending | saved | lost
  riskReason: text("risk_reason"),
  graceUntil: timestamp("grace_until", { withTimezone: true }),
  pausedUntil: timestamp("paused_until", { withTimezone: true }),
  expectStatus: text("expect_status"), // status change we initiated, so its webhook is not treated as churn
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: text("id").primaryKey(), // PayPal event id (dedupe key)
  type: text("type").notNull(),
  resourceId: text("resource_id"),
  summary: text("summary"),
  verification: text("verification").notNull(),
  origin: text("origin").notNull().default("paypal"), // paypal | local
  note: text("note"),
  payload: jsonb("payload"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const offers = pgTable("offers", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id").notNull(),
  trigger: text("trigger").notNull(), // merchant_cancel | payment_failed | suspended | paypal_cancelled
  kind: text("kind").notNull(), // pause | discount | downgrade | winback | recovery | comeback | let_go
  headline: text("headline"),
  message: text("message"),
  rationale: text("rationale"),
  engine: text("engine"),
  reason: text("reason"),
  priceMonthly: doublePrecision("price_monthly"),
  months: integer("months"),
  targetPlanId: text("target_plan_id"),
  status: text("status").notNull().default("proposed"), // proposed | pending_consent | saved | declined | lost
  approveUrl: text("approve_url"),
  newSubscriptionId: text("new_subscription_id"),
  mrrSaved: doublePrecision("mrr_saved").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const outbox = pgTable("outbox", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id"),
  offerId: text("offer_id"),
  toEmail: text("to_email"),
  toName: text("to_name"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),
  trigger: text("trigger"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Subscriber = typeof subscribers.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type OutboxMsg = typeof outbox.$inferSelect;
