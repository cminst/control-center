const express = require("express");
const { getDb } = require("../models/db");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

const NOTE_COMMAND_TEXT = "note";
const NOTE_OUTPUT_TEXT = "N/A";

function parseSharedList(sharedWith) {
  if (!sharedWith) return [];
  return sharedWith.split(",").filter(Boolean);
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const notes = await db.all(
      `
        SELECT commands.*, command_groups.color AS group_color,
               GROUP_CONCAT(shared_users.username, ',') AS shared_with
        FROM commands
        LEFT JOIN command_groups ON commands.group_id = command_groups.id
        LEFT JOIN command_shares ON command_shares.command_id = commands.id
        LEFT JOIN users shared_users ON shared_users.id = command_shares.shared_with_user_id
        WHERE commands.owner_id = ?
          AND commands.is_note = 1
        GROUP BY commands.id
        ORDER BY commands.created_at DESC
      `,
      req.session.userId,
    );

    const formatted = notes.map((note) => ({
      ...note,
      shared_with: parseSharedList(note.shared_with),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

router.get("/shared", requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.session.userId;

    const notes = await db.all(
      `
        SELECT DISTINCT commands.*, command_groups.color AS group_color,
               owners.username AS owner_username
        FROM commands
        JOIN users owners ON owners.id = commands.owner_id
        LEFT JOIN command_groups ON commands.group_id = command_groups.id
        JOIN command_shares ON command_shares.command_id = commands.id
        WHERE command_shares.shared_with_user_id = ?
          AND commands.owner_id != ?
          AND commands.is_note = 1
        ORDER BY commands.created_at DESC
      `,
      [userId, userId],
    );

    res.json(notes);
  } catch (error) {
    console.error("Error fetching shared notes:", error);
    res.status(500).json({ error: "Failed to fetch shared notes" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const userId = req.session.userId;

    const note = await db.get(
      `
        SELECT commands.*, command_groups.color AS group_color,
               owners.username AS owner_username,
               GROUP_CONCAT(shared_users.username, ',') AS shared_with,
               CASE WHEN commands.owner_id = ? THEN 1 ELSE 0 END AS is_owner
        FROM commands
        JOIN users owners ON owners.id = commands.owner_id
        LEFT JOIN command_groups ON commands.group_id = command_groups.id
        LEFT JOIN command_shares ON command_shares.command_id = commands.id
        LEFT JOIN users shared_users ON shared_users.id = command_shares.shared_with_user_id
        WHERE commands.id = ?
          AND commands.is_note = 1
          AND (
            commands.owner_id = ?
            OR EXISTS (
              SELECT 1 FROM command_shares
              WHERE command_shares.command_id = commands.id
                AND command_shares.shared_with_user_id = ?
            )
          )
        GROUP BY commands.id
      `,
      [userId, id, userId, userId],
    );

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json({
      ...note,
      shared_with: parseSharedList(note.shared_with),
    });
  } catch (error) {
    console.error("Error fetching note detail:", error);
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { note, name, title } = req.body;
    const ownerId = req.session.userId;

    const noteValue = typeof note === "string" ? note.trim() : "";
    if (!noteValue) {
      return res.status(400).json({ error: "Note is required" });
    }

    const rawName =
      typeof name === "string"
        ? name
        : typeof title === "string"
          ? title
          : "";
    const nameValue = rawName.trim() || null;

    const db = await getDb();
    const result = await db.run(
      `
        INSERT INTO commands (owner_id, project_id, name, command_text, output_text, note_markdown, is_note)
        VALUES (?, NULL, ?, ?, ?, ?, 1)
      `,
      [ownerId, nameValue, NOTE_COMMAND_TEXT, NOTE_OUTPUT_TEXT, noteValue],
    );

    const created = await db.get(
      `
        SELECT commands.*, command_groups.color AS group_color
        FROM commands
        LEFT JOIN command_groups ON commands.group_id = command_groups.id
        WHERE commands.id = ?
      `,
      result.lastID,
    );

    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ error: "Failed to create note" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { note, name, title } = req.body;
    const ownerId = req.session.userId;

    const db = await getDb();
    const existing = await db.get(
      "SELECT id FROM commands WHERE id = ? AND owner_id = ? AND is_note = 1",
      [id, ownerId],
    );
    if (!existing) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const noteValue = typeof note === "string" ? note.trim() : "";
    if (!noteValue) {
      return res.status(400).json({ error: "Note is required" });
    }

    const hasName =
      typeof name === "string" || typeof title === "string";
    const rawName =
      typeof name === "string"
        ? name
        : typeof title === "string"
          ? title
          : "";
    const nameValue = rawName.trim() || null;

    if (hasName) {
      await db.run(
        `
          UPDATE commands
          SET name = ?, note_markdown = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [nameValue, noteValue, id],
      );
    } else {
      await db.run(
        `
          UPDATE commands
          SET note_markdown = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [noteValue, id],
      );
    }

    const updated = await db.get(
      `
        SELECT commands.*, command_groups.color AS group_color,
               owners.username AS owner_username,
               GROUP_CONCAT(shared_users.username, ',') AS shared_with,
               CASE WHEN commands.owner_id = ? THEN 1 ELSE 0 END AS is_owner
        FROM commands
        JOIN users owners ON owners.id = commands.owner_id
        LEFT JOIN command_groups ON commands.group_id = command_groups.id
        LEFT JOIN command_shares ON command_shares.command_id = commands.id
        LEFT JOIN users shared_users ON shared_users.id = command_shares.shared_with_user_id
        WHERE commands.id = ?
          AND commands.is_note = 1
        GROUP BY commands.id
      `,
      [ownerId, id],
    );

    res.json({
      ...updated,
      shared_with: parseSharedList(updated.shared_with),
    });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ error: "Failed to update note" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.session.userId;

    const db = await getDb();
    const existing = await db.get(
      "SELECT id FROM commands WHERE id = ? AND owner_id = ? AND is_note = 1",
      [id, ownerId],
    );
    if (!existing) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await db.run("DELETE FROM command_shares WHERE command_id = ?", id);
    await db.run("DELETE FROM commands WHERE id = ?", id);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

router.post("/:id/share", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    const ownerId = req.session.userId;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const db = await getDb();
    const note = await db.get(
      "SELECT id FROM commands WHERE id = ? AND owner_id = ? AND is_note = 1",
      [id, ownerId],
    );
    if (!note) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const user = await db.get(
      "SELECT id, username FROM users WHERE username = ?",
      username,
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.id === ownerId) {
      return res.status(400).json({ error: "Cannot share with yourself" });
    }

    await db.run(
      `
        INSERT OR IGNORE INTO command_shares (command_id, shared_with_user_id)
        VALUES (?, ?)
      `,
      [id, user.id],
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error sharing note:", error);
    res.status(500).json({ error: "Failed to share note" });
  }
});

module.exports = router;
