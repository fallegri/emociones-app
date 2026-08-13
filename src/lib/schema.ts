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
  emotions: jsonb("emotions").notNull(), // Always a flat array of detected emotion strings
  dominantEmotion: varchar("dominant_emotion", { length: 50 }).notNull(),
  message: text("message").notNull(),
  hour: integer("hour").notNull(), // 0-23 for peak hour analysis
  snapshotImage: text("snapshot_image"), // Base64 JPEG image from snapshot mode (optional)
  personEmotions: jsonb("person_emotions"), // Per-person emotion history from contador mode (optional)
});

export type EmotionCapture = typeof emotionCaptures.$inferSelect;
export type NewEmotionCapture = typeof emotionCaptures.$inferInsert;
