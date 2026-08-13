import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";

export const emotionCaptures = pgTable("emotion_captures", {
  id: serial("id").primaryKey(),
  eventName: varchar("event_name", { length: 255 }).notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  personCount: integer("person_count").notNull(),
  emotions: jsonb("emotions").notNull(), // Array of detected emotions per person
  dominantEmotion: varchar("dominant_emotion", { length: 50 }).notNull(),
  message: text("message").notNull(),
  hour: integer("hour").notNull(), // 0-23 for peak hour analysis
});

export type EmotionCapture = typeof emotionCaptures.$inferSelect;
export type NewEmotionCapture = typeof emotionCaptures.$inferInsert;
