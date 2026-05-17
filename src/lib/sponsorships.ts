import { createClient, type Client } from "@libsql/client";
import path from "path";

export interface SponsorshipItem {
  id: string;
  category: string;
  portion: number | null;
  totalPortions: number | null;
  amount: number;
  claimedBy: string | null;
  claimedAt: string | null;
  paid: boolean;
}

let _db: Client | null = null;

function getDb(): Client {
  if (!_db) {
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL || `file:${path.join(process.cwd(), "data", "sponsorships.db")}`,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _db;
}

const SEED_ITEMS: { name: string; price: number }[] = [
  { name: "Welcome Kit", price: 500 },
  { name: "Snacks", price: 300 },
  { name: "Picnic Lunch", price: 400 },
  { name: "Breakfast", price: 300 },
  { name: "Cook Out Lunch", price: 400 },
  { name: "Photographer", price: 1500 },
  { name: "The 1812 Farm", price: 11000 },
  { name: "Farewell Dinner", price: 3500 },
  { name: "Floors / Tents", price: 1000 },
];

let initialized = false;

async function init() {
  if (initialized) return;

  await getDb().execute(`
    CREATE TABLE IF NOT EXISTS sponsorships (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      portion INTEGER,
      total_portions INTEGER,
      amount INTEGER NOT NULL,
      claimed_by TEXT,
      claimed_at TEXT,
      paid INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Add paid column if it doesn't exist (migration for existing databases)
  try {
    await getDb().execute("ALTER TABLE sponsorships ADD COLUMN paid INTEGER NOT NULL DEFAULT 0");
  } catch {
    // Column already exists
  }

  const { rows } = await getDb().execute("SELECT COUNT(*) as count FROM sponsorships");
  if (Number(rows[0].count) === 0) {
    const stmts: { sql: string; args: (string | number | null)[] }[] = [];

    for (const item of SEED_ITEMS) {
      if (item.price <= 500) {
        stmts.push({
          sql: "INSERT INTO sponsorships (id, category, portion, total_portions, amount, claimed_by, claimed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [item.name.toLowerCase().replace(/\s+/g, "-"), item.name, null, null, item.price, null, null],
        });
      } else {
        const portions = item.price / 500;
        for (let i = 1; i <= portions; i++) {
          stmts.push({
            sql: "INSERT INTO sponsorships (id, category, portion, total_portions, amount, claimed_by, claimed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            args: [`${item.name.toLowerCase().replace(/\s+/g, "-")}-${i}`, item.name, i, portions, 500, null, null],
          });
        }
      }
    }

    await getDb().batch(stmts);
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
    paid: Boolean(row.paid),
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

  await getDb().execute({ sql: "UPDATE sponsorships SET claimed_by = NULL, claimed_at = NULL WHERE id = ?", args: [id] });
  return { success: true };
}

export async function markPaid(
  id: string,
  paid: boolean
): Promise<{ success: boolean; error?: string }> {
  await init();

  const { rows } = await getDb().execute({ sql: "SELECT * FROM sponsorships WHERE id = ?", args: [id] });
  if (rows.length === 0) return { success: false, error: "Item not found" };

  await getDb().execute({ sql: "UPDATE sponsorships SET paid = ? WHERE id = ?", args: [paid ? 1 : 0, id] });
  return { success: true };
}
