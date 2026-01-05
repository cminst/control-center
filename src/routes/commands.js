const express = require("express");
const { getDb } = require("../models/db");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

function parseSharedList(sharedWith) {
  if (!sharedWith) return [];
  return sharedWith.split(",").filter(Boolean);
}

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const commands = await db.all(
      `
        SELECT commands.*, projects.name AS project_name,
               GROUP_CONCAT(shared_users.username, ',') AS shared_with
        FROM commands
        LEFT JOIN projects ON commands.project_id = projects.id
        LEFT JOIN command_shares ON command_shares.command_id = commands.id
        LEFT JOIN users shared_users ON shared_users.id = command_shares.shared_with_user_id
        WHERE commands.owner_id = ?
        GROUP BY commands.id
        ORDER BY commands.created_at DESC
      `,
      req.session.userId,
    );

    const formatted = commands.map((command) => ({
      ...command,
      shared_with: parseSharedList(command.shared_with),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching commands:", error);
    res.status(500).json({ error: "Failed to fetch commands" });
  }
});

router.get("/shared", requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.session.userId;

    const commands = await db.all(
      `
        SELECT DISTINCT commands.*, projects.id AS project_id, projects.name AS project_name,
               owners.username AS owner_username
        FROM commands
        JOIN users owners ON owners.id = commands.owner_id
        LEFT JOIN projects ON commands.project_id = projects.id
        LEFT JOIN command_shares ON command_shares.command_id = commands.id
        LEFT JOIN project_shares ON project_shares.project_id = commands.project_id
        WHERE (command_shares.shared_with_user_id = ? OR project_shares.shared_with_user_id = ?)
          AND commands.owner_id != ?
        ORDER BY commands.created_at DESC
      `,
      [userId, userId, userId],
    );

    res.json(commands);
  } catch (error) {
    console.error("Error fetching shared commands:", error);
    res.status(500).json({ error: "Failed to fetch shared commands" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const userId = req.session.userId;

    const command = await db.get(
      `
        SELECT commands.*, projects.name AS project_name,
               owners.username AS owner_username,
               GROUP_CONCAT(shared_users.username, ',') AS shared_with,
               CASE WHEN commands.owner_id = ? THEN 1 ELSE 0 END AS is_owner
        FROM commands
        JOIN users owners ON owners.id = commands.owner_id
        LEFT JOIN projects ON commands.project_id = projects.id
        LEFT JOIN command_shares ON command_shares.command_id = commands.id
        LEFT JOIN users shared_users ON shared_users.id = command_shares.shared_with_user_id
        WHERE commands.id = ?
          AND (
            commands.owner_id = ?
            OR EXISTS (
              SELECT 1 FROM command_shares
              WHERE command_shares.command_id = commands.id
                AND command_shares.shared_with_user_id = ?
            )
            OR EXISTS (
              SELECT 1 FROM project_shares
              WHERE project_shares.project_id = commands.project_id
                AND project_shares.shared_with_user_id = ?
            )
          )
        GROUP BY commands.id
      `,
      [userId, id, userId, userId, userId],
    );

    if (!command) {
      return res.status(404).json({ error: "Command not found" });
    }

    res.json({
      ...command,
      shared_with: parseSharedList(command.shared_with),
    });
  } catch (error) {
    console.error("Error fetching command detail:", error);
    res.status(500).json({ error: "Failed to fetch command" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, command, output, note, projectId } = req.body;
    const ownerId = req.session.userId;

    if (!command || !output) {
      return res
        .status(400)
        .json({ error: "Command and output are required" });
    }

    const nameValue =
      typeof name === "string" && name.trim() ? name.trim() : null;

    let projectIdValue = null;
    if (projectId) {
      const db = await getDb();
      const project = await db.get(
        "SELECT id FROM projects WHERE id = ? AND owner_id = ?",
        [projectId, ownerId],
      );
      if (!project) {
        return res.status(403).json({ error: "Invalid project access" });
      }
      projectIdValue = projectId;
    }

    const db = await getDb();
    const result = await db.run(
      `
        INSERT INTO commands (owner_id, project_id, name, command_text, output_text, note_markdown)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [ownerId, projectIdValue, nameValue, command, output, note || null],
    );

    const created = await db.get(
      `
        SELECT commands.*, projects.name AS project_name
        FROM commands
        LEFT JOIN projects ON commands.project_id = projects.id
        WHERE commands.id = ?
      `,
      result.lastID,
    );

    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating command:", error);
    res.status(500).json({ error: "Failed to create command" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, command, output, note } = req.body;
    const ownerId = req.session.userId;

    const db = await getDb();
    const existing = await db.get(
      "SELECT id FROM commands WHERE id = ? AND owner_id = ?",
      [id, ownerId],
    );
    if (!existing) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const nameValue =
      typeof name === "string" && name.trim() ? name.trim() : null;

    await db.run(
      `
        UPDATE commands
        SET name = ?, command_text = ?, output_text = ?, note_markdown = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [nameValue, command, output, note, id],
    );

    const updated = await db.get(
      `
        SELECT commands.*, projects.name AS project_name,
               owners.username AS owner_username,
               GROUP_CONCAT(shared_users.username, ',') AS shared_with,
               CASE WHEN commands.owner_id = ? THEN 1 ELSE 0 END AS is_owner
        FROM commands
        JOIN users owners ON owners.id = commands.owner_id
        LEFT JOIN projects ON commands.project_id = projects.id
        LEFT JOIN command_shares ON command_shares.command_id = commands.id
        LEFT JOIN users shared_users ON shared_users.id = command_shares.shared_with_user_id
        WHERE commands.id = ?
        GROUP BY commands.id
      `,
      [ownerId, id],
    );

    res.json({
      ...updated,
      shared_with: parseSharedList(updated.shared_with),
    });
  } catch (error) {
    console.error("Error updating command:", error);
    res.status(500).json({ error: "Failed to update command" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.session.userId;

    const db = await getDb();
    const existing = await db.get(
      "SELECT id FROM commands WHERE id = ? AND owner_id = ?",
      [id, ownerId],
    );
    if (!existing) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await db.run("DELETE FROM command_shares WHERE command_id = ?", id);
    await db.run("DELETE FROM commands WHERE id = ?", id);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting command:", error);
    res.status(500).json({ error: "Failed to delete command" });
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
    const command = await db.get(
      "SELECT id FROM commands WHERE id = ? AND owner_id = ?",
      [id, ownerId],
    );
    if (!command) {
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
    console.error("Error sharing command:", error);
    res.status(500).json({ error: "Failed to share command" });
  }
});

module.exports = router;
