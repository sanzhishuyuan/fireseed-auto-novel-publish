const D = require("better-sqlite3");
const db = new D("data/novel.db");

// Check tables exist
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log("Tables:", tables.map(t => t.name).join(", "));

// Create platform wallet with parameterized query
const stmt = db.prepare("INSERT OR IGNORE INTO wallets(user_id, balance, total_earned) VALUES(?, ?, ?)");
stmt.run("platform", 0, 0);
console.log("Platform wallet OK");

// Stats
const wc = db.prepare("SELECT COUNT(*) as c FROM wallets").get();
const total = db.prepare("SELECT SUM(balance) as s FROM wallets WHERE user_id != 'platform'").get();
console.log("Wallets:", wc.c, "Circulation:", total.s);
