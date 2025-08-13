import { db } from "./server/db";
import { settings } from "./shared/schema";

async function initSettings() {
  try {
    // Insert default settings
    await db.insert(settings).values([
      { key: "file_price_per_kg", value: "12.50" },
      { key: "spine_price_per_kg", value: "8.00" },
    ]).onConflictDoNothing();

    console.log("✅ Default settings initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing settings:", error);
  }
}

initSettings().then(() => process.exit(0));