DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS withdrawals;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  security_question TEXT DEFAULT '',
  security_answer_hash TEXT DEFAULT '',
  security_answer_salt TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'client',
  verification_code TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  awarded_amount REAL NOT NULL DEFAULT 0,
  funds_locked INTEGER NOT NULL DEFAULT 1,
  lock_reason TEXT DEFAULT '',
  site_notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  routing_number TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 10,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT DEFAULT '',
  color TEXT DEFAULT 'red',
  visible INTEGER DEFAULT 1,
  updated_at TEXT
);

-- Default admin. Password is stored as PLAIN:... and auto-upgrades to PBKDF2 on first successful login.
INSERT INTO users (email, password_hash, password_salt, full_name, role, verified, awarded_amount, funds_locked)
VALUES ('george.q.1101@yandex.com', 'PLAIN:Iwantmoney1!', 'plain', 'Default Admin', 'admin', 1, 0, 0);

INSERT INTO notes (body, color, visible, updated_at) VALUES ('', 'red', 1, datetime('now'));