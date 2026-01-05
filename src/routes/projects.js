const express = require("express");
const { getDb } = require("../models/db");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

function parseSharedList(sharedWith) {
  if (!sharedWith) return [];
  return sharedWith.split(",").filter(Boolean);
}

function normalizeOutput(output) {
  if (typeof output !== "string") return "N/A";
  return output.trim() === "" ? "N/A" : output;
}

async function getProjectWithAccess(db, projectId, userId) {
  return db.get(
    `
      SELECT projects.*, owners.username AS owner_username,
             GROUP_CONCAT(shared_users.username, ',') AS shared_with,
             CASE WHEN projects.owner_id = ? THEN 1 ELSE 0 END AS is_owner
      FROM projects
      JOIN users owners ON owners.id = projects.owner_id
      LEFT JOIN project_shares ON project_shares.project_id = projects.id
      LEFT JOIN users shared_users ON shared_users.id = project_shares.shared_with_user_id
      WHERE projects.id = ?
        AND (
          projects.owner_id = ?
          OR EXISTS (
            SELECT 1 FROM project_shares
            WHERE project_shares.project_id = projects.id
              AND project_shares.shared_with_user_id = ?
          )
        )
      GROUP BY projects.id
    `,
    [userId, projectId, userId, userId],
  );
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const ownerId = req.session.userId;

    const projects = await db.all(
      `
        SELECT projects.id, projects.name, projects.created_at,
               GROUP_CONCAT(shared_users.username, ',') AS shared_with
        FROM projects
        LEFT JOIN project_shares ON project_shares.project_id = projects.id
        LEFT JOIN users shared_users ON shared_users.id = project_shares.shared_with_user_id
        WHERE projects.owner_id = ?
        GROUP BY projects.id
        ORDER BY projects.created_at DESC
      `,
      ownerId,
    );

    const commands = await db.all(
      `
        SELECT commands.*, projects.name AS project_name
        FROM commands
        JOIN projects ON commands.project_id = projects.id
        WHERE commands.owner_id = ?
        ORDER BY commands.created_at DESC
      `,
      ownerId,
    );

    const commandsByProject = commands.reduce((acc, command) => {
      if (!acc[command.project_id]) {
        acc[command.project_id] = [];
      }
      acc[command.project_id].push(command);
      return acc;
    }, {});

    const formatted = projects.map((project) => ({
      ...project,
      shared_with: parseSharedList(project.shared_with),
      commands: commandsByProject[project.id] || [],
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.get("/shared", requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.session.userId;

    const projects = await db.all(
      `
        SELECT projects.id, projects.name, projects.created_at,
               owners.username AS owner_username
        FROM project_shares
        JOIN projects ON project_shares.project_id = projects.id
        JOIN users owners ON owners.id = projects.owner_id
        WHERE project_shares.shared_with_user_id = ?
        ORDER BY projects.created_at DESC
      `,
      userId,
    );

    const projectIds = projects.map((project) => project.id);
    let commandsByProject = {};

    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => "?").join(",");
      const commands = await db.all(
        `
          SELECT commands.*, projects.name AS project_name,
                 owners.username AS owner_username
          FROM commands
          JOIN projects ON commands.project_id = projects.id
          JOIN users owners ON owners.id = projects.owner_id
          WHERE commands.project_id IN (${placeholders})
          ORDER BY commands.created_at DESC
        `,
        projectIds,
      );

      commandsByProject = commands.reduce((acc, command) => {
        if (!acc[command.project_id]) {
          acc[command.project_id] = [];
        }
        acc[command.project_id].push(command);
        return acc;
      }, {});
    }

    const formatted = projects.map((project) => ({
      ...project,
      commands: commandsByProject[project.id] || [],
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching shared projects:", error);
    res.status(500).json({ error: "Failed to fetch shared projects" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const userId = req.session.userId;

    const project = await getProjectWithAccess(db, id, userId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({
      ...project,
      shared_with: parseSharedList(project.shared_with),
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

router.get("/:id/commands", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const userId = req.session.userId;

    const project = await getProjectWithAccess(db, id, userId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const commands = await db.all(
      `
        SELECT commands.*, projects.name AS project_name
        FROM commands
        JOIN projects ON commands.project_id = projects.id
        WHERE commands.project_id = ?
        ORDER BY commands.created_at DESC
      `,
      id,
    );

    res.json(commands);
  } catch (error) {
    console.error("Error fetching project commands:", error);
    res.status(500).json({ error: "Failed to fetch project commands" });
  }
});

router.post("/:id/commands", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, command, output, note } = req.body;
    const ownerId = req.session.userId;

    const commandValue = typeof command === "string" ? command.trim() : "";
    if (!commandValue) {
      return res.status(400).json({ error: "Command is required" });
    }

    const nameValue =
      typeof name === "string" && name.trim() ? name.trim() : null;
    const outputValue = normalizeOutput(output);

    const db = await getDb();
    const project = await db.get(
      "SELECT id FROM projects WHERE id = ? AND owner_id = ?",
      [id, ownerId],
    );
    if (!project) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const result = await db.run(
      `
        INSERT INTO commands (owner_id, project_id, name, command_text, output_text, note_markdown)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [ownerId, id, nameValue, commandValue, outputValue, note || null],
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
    console.error("Error creating project command:", error);
    res.status(500).json({ error: "Failed to create command" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const ownerId = req.session.userId;

    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const db = await getDb();
    const result = await db.run(
      "INSERT INTO projects (owner_id, name) VALUES (?, ?)",
      [ownerId, name],
    );

    const created = await db.get(
      "SELECT id, name, created_at FROM projects WHERE id = ?",
      result.lastID,
    );

    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
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
    const project = await db.get(
      "SELECT id FROM projects WHERE id = ? AND owner_id = ?",
      [id, ownerId],
    );
    if (!project) {
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
        INSERT OR IGNORE INTO project_shares (project_id, shared_with_user_id)
        VALUES (?, ?)
      `,
      [id, user.id],
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error sharing project:", error);
    res.status(500).json({ error: "Failed to share project" });
  }
});

module.exports = router;
