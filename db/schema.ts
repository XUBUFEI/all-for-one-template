import { sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
export const records = sqliteTable("records", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  kind: text("kind").notNull(),
  happenedOn: text("happened_on").notNull(),
  data: text("data").notNull(),
  source: text("source").notNull(),
  sourceKey: text("source_key").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => [uniqueIndex("record_source_unique").on(t.owner, t.source, t.sourceKey), index("record_owner_date").on(t.owner, t.happenedOn)]);
