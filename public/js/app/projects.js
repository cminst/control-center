import { dom } from "./dom.js";
import { state } from "./state.js";
import { escapeHtml, formatDate, setupAutosizeTextarea } from "./utils.js";
import {
  applyPendingCommandCloneToProject,
  renderCommandGallery,
} from "./commands.js";

export function initProjects() {
  setupAutosizeTextarea(dom.projectCommandTextInput);
}

export async function handleProjectFormSubmit(event) {
  event.preventDefault();
  dom.projectError.textContent = "";

  const name = document.getElementById("project-name").value.trim();

  try {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await response.json();
    if (response.ok) {
      dom.projectForm.reset();
      await loadProjects();
    } else {
      dom.projectError.textContent = data.error || "Failed to create project";
    }
  } catch (error) {
    console.error("Project error:", error);
    dom.projectError.textContent = "An error occurred. Please try again.";
  }
}

export async function handleProjectCommandFormSubmit(event) {
  event.preventDefault();
  dom.projectCommandError.textContent = "";

  if (!state.activeProjectId) {
    dom.projectCommandError.textContent = "No project selected.";
    return;
  }

  const name = document.getElementById("project-command-name").value.trim();
  const command = document
    .getElementById("project-command-text")
    .value.trim();
  const output = document.getElementById("project-command-output").value.trim();
  const note = document.getElementById("project-command-note").value.trim();

  try {
    const response = await fetch(
      `/api/projects/${state.activeProjectId}/commands`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || null,
          command,
          output,
          note: note || null,
        }),
      },
    );

    const data = await response.json();
    if (response.ok) {
      dom.projectCommandForm.reset();
      setupAutosizeTextarea(dom.projectCommandTextInput);
      await loadProjectCommands(state.activeProjectId);
    } else {
      dom.projectCommandError.textContent = data.error || "Failed to save command";
    }
  } catch (error) {
    console.error("Project command error:", error);
    dom.projectCommandError.textContent = "An error occurred. Please try again.";
  }
}

export async function loadProjects() {
  try {
    const [ownedResponse, sharedResponse] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/projects/shared"),
    ]);
    const ownedProjects = ownedResponse.ok ? await ownedResponse.json() : [];
    const sharedProjects = sharedResponse.ok ? await sharedResponse.json() : [];
    if (ownedResponse.ok || sharedResponse.ok) {
      const merged = new Map();
      ownedProjects.forEach((project) => {
        merged.set(project.id, {
          ...project,
          is_shared: false,
        });
      });
      sharedProjects.forEach((project) => {
        if (!merged.has(project.id)) {
          merged.set(project.id, {
            ...project,
            is_shared: true,
          });
        }
      });
      const combined = Array.from(merged.values()).sort((a, b) =>
        String(b.created_at || "").localeCompare(String(a.created_at || "")),
      );
      renderProjectGallery(dom.projectGallery, combined, {
        emptyMessage: "No projects yet.",
      });
    }
  } catch (error) {
    console.error("Load projects error:", error);
  }
}

export async function loadProjectDetail(projectId) {
  state.activeProjectId = projectId;
  state.activeProjectData = null;
  state.activeProjectIsOwner = false;
  state.activeDetailType = "project";
  dom.projectCommandError.textContent = "";
  dom.projectCommandGallery.innerHTML = "";

  try {
    const [projectResponse, commandsResponse] = await Promise.all([
      fetch(`/api/projects/${projectId}`),
      fetch(`/api/projects/${projectId}/commands`),
    ]);

    if (!projectResponse.ok) {
      dom.projectDetailTitle.textContent = "Project not found";
      dom.projectCommandGallery.innerHTML =
        '<div class="empty-state">Project not found.</div>';
      dom.projectCommandCard.classList.add("hidden");
      dom.projectShareButton.classList.add("hidden");
      if (dom.projectDeleteButton) {
        dom.projectDeleteButton.classList.add("hidden");
      }
      return;
    }

    const project = await projectResponse.json();
    const commands = commandsResponse.ok ? await commandsResponse.json() : [];

    dom.projectDetailTitle.textContent = project.name || "Project";
    dom.projectBreadcrumb.textContent = "Projects";
    state.activeProjectData = project;

    const isOwner = Boolean(project.is_owner);
    state.activeProjectIsOwner = isOwner;
    dom.projectCommandCard.classList.toggle("hidden", !isOwner);
    dom.projectShareButton.classList.toggle("hidden", !isOwner);
    if (dom.projectDeleteButton) {
      dom.projectDeleteButton.classList.toggle("hidden", !isOwner);
    }

    state.detailFallbackPath = "/projects";

    renderCommandGallery(dom.projectCommandGallery, commands, {
      enableLinking: isOwner,
    });
    if (isOwner) {
      applyPendingCommandCloneToProject(projectId);
    }
  } catch (error) {
    console.error("Load project detail error:", error);
    dom.projectCommandGallery.innerHTML =
      '<div class="empty-state">Unable to load project.</div>';
    dom.projectShareButton.classList.add("hidden");
    dom.projectCommandCard.classList.add("hidden");
    if (dom.projectDeleteButton) {
      dom.projectDeleteButton.classList.add("hidden");
    }
  }
}

export async function loadProjectCommands(projectId) {
  try {
    const response = await fetch(`/api/projects/${projectId}/commands`);
    const data = await response.json();
    if (response.ok) {
      renderCommandGallery(dom.projectCommandGallery, data, {
        enableLinking: Boolean(state.activeProjectIsOwner),
      });
    }
  } catch (error) {
    console.error("Load project commands error:", error);
  }
}

export function renderProjectGallery(container, projects, options = {}) {
  if (!projects || projects.length === 0) {
    container.innerHTML =
      `<div class="empty-state">${escapeHtml(options.emptyMessage || "No projects yet.")}</div>`;
    return;
  }

  container.innerHTML = projects
    .map((project) => renderProjectTile(project, options))
    .join("");
}

export function renderProjectTile(project, options = {}) {
  const createdAt = formatDate(project.created_at);
  const commandCount = Array.isArray(project.commands)
    ? project.commands.length
    : 0;
  const countLabel =
    commandCount === 1 ? "1 command" : `${commandCount} commands`;
  const ownerLabel =
    project.is_shared && project.owner_username
      ? `Owner: ${project.owner_username}`
      : "";
  const sharedTag = project.is_shared
    ? `
        <span class="tag project-link">
          Open project
        </span>
      `
    : "";

  return `
      <article class="project-tile" data-project-id="${project.id}">
        <h3>${escapeHtml(project.name)}</h3>
        <span class="command-preview-meta">${escapeHtml(createdAt)}</span>
        ${ownerLabel ? `<span class="command-preview-meta">${escapeHtml(ownerLabel)}</span>` : ""}
        <div class="project-tile-footer">
          <span class="badge">${escapeHtml(countLabel)}</span>
          ${sharedTag}
        </div>
      </article>
    `;
}
