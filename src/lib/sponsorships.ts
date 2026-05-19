import { createClient, type Client } from "@libsql/client";
import fs from "fs";
import path from "path";

export type PaymentStatus = "unpaid" | "paid" | "in_kind";

export interface SponsorshipItem {
  id: string;
  category: string;
  portion: number | null;
  totalPortions: number | null;
  amount: number;
  claimedBy: string | null;
  claimedAt: string | null;
  paymentStatus: PaymentStatus;
}

let _db: Client | null = null;

function getDb(): Client {
  if (!_db) {
    if (process.env.TURSO_DATABASE_URL) {
      _db = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
    } else {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      _db = createClient({ url: `file:${path.join(dataDir, "sponsorships.db")}` });
    }
  }
  return _db;
}

// Schema version — bump this to force a re-seed on next startup
const SCHEMA_VERSION = 2;

interface SeedPortion {
  amount: number;
  count: number;
}

interface SeedItem {
  name: string;
  portions: SeedPortion[];
}

const SEED_ITEMS: SeedItem[] = [
  { name: "Welcome Kit", portions: [{ amount: 500, count: 1 }] },
  { name: "Snacks", portions: [{ amount: 300, count: 1 }] },
  { name: "Picnic Lunch", portions: [{ amount: 400, count: 1 }] },
  { name: "Breakfast", portions: [{ amount: 300, count: 1 }] },
  { name: "Cook Out Lunch", portions: [{ amount: 400, count: 1 }] },
  { name: "Photographer", portions: [{ amount: 500, count: 3 }] },
  {
    name: "The 1812 Farm",
    portions: [
      { amount: 500, count: 17 },
      { amount: 250, count: 6 },
      { amount: 100, count: 10 },
    ],
  },
  { name: "Farewell Dinner", portions: [{ amount: 500, count: 7 }] },
  { name: "Floors / Tents", portions: [{ amount: 500, count: 2 }] },
  { name: "Fireworks", portions: [{ amount: 500, count: 1 }] },
];

let initialized = false;

async function init() {
  if (initialized) return;

  // Create version tracking table
  await getDb().execute(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    )
  `);

  // Check current version
  const { rows: vRows } = await getDb().execute("SELECT version FROM schema_version LIMIT 1");
  const currentVersion = vRows.length > 0 ? Number(vRows[0].version) : 0;

  if (currentVersion < SCHEMA_VERSION) {
    // Drop and recreate with new schema
    await getDb().execute("DROP TABLE IF EXISTS sponsorships");
    await getDb().execute(`
      CREATE TABLE sponsorships (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        portion INTEGER,
        total_portions INTEGER,
        amount INTEGER NOT NULL,
        claimed_by TEXT,
        claimed_at TEXT,
        payment_status TEXT NOT NULL DEFAULT 'unpaid'
      )
    `);

    // Seed data
    const stmts: { sql: string; args: (string | number | null)[] }[] = [];

    for (const item of SEED_ITEMS) {
      const totalPortions = item.portions.reduce((sum, p) => sum + p.count, 0);
      const isSingle = totalPortions === 1;

      let portionIndex = 1;
      for (const portion of item.portions) {
        for (let i = 0; i < portion.count; i++) {
          const id = isSingle
            ? item.name.toLowerCase().replace(/\s+/g, "-")
            : `${item.name.toLowerCase().replace(/\s+/g, "-")}-${portionIndex}`;

          stmts.push({
            sql: "INSERT INTO sponsorships (id, category, portion, total_portions, amount, claimed_by, claimed_at, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            args: [
              id,
              item.name,
              isSingle ? null : portionIndex,
              isSingle ? null : totalPortions,
              portion.amount,
              null,
              null,
              "unpaid",
            ],
          });
          portionIndex++;
        }
      }
    }

    await getDb().batch(stmts);

    // Update version
    if (vRows.length === 0) {
      await getDb().execute({ sql: "INSERT INTO schema_version (version) VALUES (?)", args: [SCHEMA_VERSION] });
    } else {
      await getDb().execute({ sql: "UPDATE schema_version SET version = ?", args: [SCHEMA_VERSION] });
    }
  }

  initialized = true;
}

function rowToItem(row: Record<string, unknown>): SponsorshipItem {
  return {
    id: row.id as string,
    category: row.category as string,
    portion: row.portion as number | null,
    totalPortions: row.total_portions as number | null,
    amount: row.amount as number,
    claimedBy: row.claimed_by as string | null,
    claimedAt: row.claimed_at as string | null,
    paymentStatus: (row.payment_status as PaymentStatus) || "unpaid",
  };
}

export async function getItems(): Promise<SponsorshipItem[]> {
  await init();
  const { rows } = await getDb().execute("SELECT * FROM sponsorships ORDER BY rowid");
  return rows.map(rowToItem);
}

export async function claimItem(
  id: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  await init();

  const { rows } = await getDb().execute({ sql: "SELECT * FROM sponsorships WHERE id = ?", args: [id] });
  if (rows.length === 0) return { success: false, error: "Item not found" };

  const item = rowToItem(rows[0]);
  if (item.claimedBy) return { success: false, error: `Already claimed by ${item.claimedBy}` };

  await getDb().execute({
    sql: "UPDATE sponsorships SET claimed_by = ?, claimed_at = ? WHERE id = ? AND claimed_by IS NULL",
    args: [name, new Date().toISOString(), id],
  });

  return { success: true };
}

export async function unclaimItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await init();

  const { rows } = await getDb().execute({ sql: "SELECT * FROM sponsorships WHERE id = ?", args: [id] });
  if (rows.length === 0) return { success: false, error: "Item not found" };
  if (!rows[0].claimed_by) return { success: false, error: "Item is not claimed" };

  await getDb().execute({ sql: "UPDATE sponsorships SET claimed_by = NULL, claimed_at = NULL, payment_status = 'unpaid' WHERE id = ?", args: [id] });
  return { success: true };
}

export async function setPaymentStatus(
  id: string,
  status: PaymentStatus
): Promise<{ success: boolean; error?: string }> {
  await init();

  const { rows } = await getDb().execute({ sql: "SELECT * FROM sponsorships WHERE id = ?", args: [id] });
  if (rows.length === 0) return { success: false, error: "Item not found" };

  await getDb().execute({ sql: "UPDATE sponsorships SET payment_status = ? WHERE id = ?", args: [status, id] });
  return { success: true };
}
