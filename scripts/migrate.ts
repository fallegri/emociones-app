import { neon } from "@neondatabase/serverless";

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log("Creating emotion_captures table...");

  await sql`
    CREATE TABLE IF NOT EXISTS emotion_captures (
      id SERIAL PRIMARY KEY,
      event_name VARCHAR(255) NOT NULL,
      captured_at TIMESTAMP DEFAULT NOW() NOT NULL,
      person_count INTEGER NOT NULL,
      emotions JSONB NOT NULL,
      dominant_emotion VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      hour INTEGER NOT NULL
    )
  `;

  // Create indexes for better query performance
  await sql`
    CREATE INDEX IF NOT EXISTS idx_emotion_captures_event_name 
    ON emotion_captures(event_name)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_emotion_captures_hour 
    ON emotion_captures(hour)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_emotion_captures_captured_at 
    ON emotion_captures(captured_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_emotion_captures_dominant_emotion 
    ON emotion_captures(dominant_emotion)
  `;

  console.log("✅ Migration completed successfully!");
  console.log("Tables and indexes created.");
}

migrate().catch(console.error);
