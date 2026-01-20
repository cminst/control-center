const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

let db;

async function initDb() {
  db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database,
  });

  await db.exec("PRAGMA foreign_keys = ON");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users (id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS project_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      shared_with_user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (project_id, shared_with_user_id),
      FOREIGN KEY (project_id) REFERENCES projects (id),
      FOREIGN KEY (shared_with_user_id) REFERENCES users (id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS command_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      color TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users (id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      project_id INTEGER,
      group_id INTEGER,
      name TEXT,
      command_text TEXT NOT NULL,
      output_text TEXT NOT NULL,
      note_markdown TEXT,
      is_note INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users (id),
      FOREIGN KEY (project_id) REFERENCES projects (id),
      FOREIGN KEY (group_id) REFERENCES command_groups (id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS command_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command_id INTEGER NOT NULL,
      shared_with_user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (command_id, shared_with_user_id),
      FOREIGN KEY (command_id) REFERENCES commands (id),
      FOREIGN KEY (shared_with_user_id) REFERENCES users (id)
    )
  `);

  const commandColumns = await db.all("PRAGMA table_info(commands)");
  const hasGroupId = commandColumns.some((column) => column.name === "group_id");
  if (!hasGroupId) {
    await db.exec("ALTER TABLE commands ADD COLUMN group_id INTEGER");
  }

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_commands_owner ON commands (owner_id)
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_commands_project ON commands (project_id)
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_commands_group ON commands (group_id)
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_groups_owner ON command_groups (owner_id)
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_project_shares_user ON project_shares (shared_with_user_id)
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_command_shares_user ON command_shares (shared_with_user_id)
  `);

  return db;
}

async function getDb() {
  if (!db) {
    await initDb();
  }
  return db;
}

module.exports = {
  initDb,
  getDb,
};
