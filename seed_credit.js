const D = require("better-sqlite3");
const db = new D("data/novel.db");
const user = db.prepare("SELECT id, username FROM users WHERE username = ?").get("suttangle");
if (user) {
  const wal = db.prepare("SELECT balance FROM wallets WHERE user_id = ?").get(user.id);
  const oldBal = wal ? wal.balance : 0;
  if (wal) {
    db.prepare("UPDATE wallets SET balance = balance + 10000, total_earned = total_earned + 10000, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?").run(user.id);
  } else {
    db.prepare("INSERT INTO wallets(user_id, balance, total_earned) VALUES(?, 10000, 10000)").run(user.id);
  }
  console.log("User:", user.username, "| Old:", oldBal, "| New:", oldBal + 10000);
} else {
  console.log("User not found");
}
const b = db.prepare("SELECT username, balance FROM wallets w JOIN users u ON w.user_id = u.id ORDER BY balance DESC LIMIT 5").all();
b.forEach(r => console.log("  ", r.username, ":", r.balance));
