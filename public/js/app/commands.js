import { dom } from "./dom.js";
import { state } from "./state.js";
import {
  copyTextToClipboard,
  escapeHtml,
  formatDate,
  setupAutosizeTextarea,
  showCopySuccess,
  truncateCommandText,
} from "./utils.js";
import { enhanceMathRendering, renderMarkdown } from "./markdown.js";
import { setDetailEditButton } from "./detailControls.js";
import { setActiveTab } from "./tabs.js";

export function initCommands() {
  setupAutosizeTextarea(dom.commandTextInput);
}

export async function handleCommandFormSubmit(event) {
  event.preventDefault();
  dom.commandError.textContent = "";

  const name = document.getElementById("command-name").value.trim();
  const command = document.getElementById("command-text").value.trim();
  const output = document.getElementById("command-output").value.trim();
  const note = document.getElementById("command-note").value.trim();

  try {
    const response = await fetch("/api/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || null,
        command,
        output,
        note: note || null,
        projectId: null,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      dom.commandForm.reset();
      setupAutosizeTextarea(dom.commandTextInput);
      await loadCommands();
    } else {
      dom.commandError.textContent = data.error || "Failed to save command";
    }
  } catch (error) {
    console.error("Command error:", error);
    dom.commandError.textContent = "An error occurred. Please try again.";
  }
}

export async function handleCommandEditSubmit() {
  const name = document.getElementById("edit-command-name").value.trim();
  const command = document.getElementById("edit-command-text").value.trim();
  const output = document.getElementById("edit-command-output").value.trim();
  const note = document.getElementById("edit-command-note").value.trim();
  const errorEl = document.getElementById("command-edit-error");

  if (errorEl) {
    errorEl.textContent = "";
  }

  try {
    const response = await fetch(`/api/commands/${state.activeCommandId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || null,
        command,
        output,
        note: note || null,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      state.activeCommandData = data;
      state.isEditingCommand = false;
      dom.commandDetailCard.innerHTML = renderCommandDetailCard(data);
      enhanceMathRendering(dom.commandDetailCard);
      if (dom.commandDetailTitle) {
        dom.commandDetailTitle.textContent =
          data.name && data.name.trim() ? data.name : "Command Details";
      }
    } else if (errorEl) {
      errorEl.textContent = data.error || "Failed to update command";
    }
  } catch (error) {
    console.error("Command update error:", error);
    if (errorEl) {
      errorEl.textContent = "An error occurred. Please try again.";
    }
  }
}

export async function loadCommands() {
  try {
    const response = await fetch("/api/commands/mine");
    const data = await response.json();
    if (response.ok) {
      const soloCommands = data.filter((command) => !command.project_id);
      renderCommandGallery(dom.commandGallery, soloCommands);
    }
  } catch (error) {
    console.error("Load commands error:", error);
  }
}

export async function loadCommandDetail(commandId) {
  dom.commandDetailCard.innerHTML = "";
  dom.commandBreadcrumb.textContent = "";
  if (dom.commandDetailTitle) {
    dom.commandDetailTitle.textContent = "Command Details";
  }
  state.activeCommandId = commandId;
  state.activeCommandData = null;
  state.isEditingCommand = false;
  state.activeDetailType = "command";

  try {
    const response = await fetch(`/api/commands/${commandId}`);
    const data = await response.json();
    if (!response.ok) {
      dom.commandDetailCard.innerHTML =
        '<div class="empty-state">Command not found.</div>';
      dom.commandShareButton.classList.add("hidden");
      dom.commandEditButton.classList.add("hidden");
      if (dom.commandCloneButton) {
        dom.commandCloneButton.classList.add("hidden");
      }
      dom.commandDeleteButton.classList.add("hidden");
      state.detailFallbackPath = "/my_commands";
      return;
    }

    dom.commandDetailCard.innerHTML = renderCommandDetailCard(data);
    enhanceMathRendering(dom.commandDetailCard);
    state.activeCommandData = data;
    if (dom.commandDetailTitle) {
      dom.commandDetailTitle.textContent =
        data.name && data.name.trim() ? data.name : "Command Details";
    }
    setDetailEditButton({
      icon: "edit",
      label: "Edit command",
      shareScope: "command",
    });
    dom.commandShareButton.classList.toggle("hidden", !data.is_owner);
    dom.commandEditButton.classList.toggle("hidden", !data.is_owner);
    if (dom.commandCloneButton) {
      dom.commandCloneButton.classList.toggle("hidden", !data.is_owner);
    }
    dom.commandDeleteButton.classList.toggle("hidden", !data.is_owner);

    if (data.project_id && data.project_name) {
      const commandSnippet = truncateCommandText(data.command_text, 40);
      dom.commandBreadcrumb.textContent = `Projects > ${data.project_name} > ${commandSnippet}`;
      state.detailFallbackPath = `/projects/${data.project_id}`;
      setActiveTab("projects");
    } else {
      dom.commandBreadcrumb.textContent = "";
      state.detailFallbackPath = "/my_commands";
      setActiveTab("commands");
    }
  } catch (error) {
    console.error("Load command detail error:", error);
    dom.commandDetailCard.innerHTML =
      '<div class="empty-state">Unable to load command.</div>';
    dom.commandShareButton.classList.add("hidden");
    dom.commandEditButton.classList.add("hidden");
    if (dom.commandCloneButton) {
      dom.commandCloneButton.classList.add("hidden");
    }
    dom.commandDeleteButton.classList.add("hidden");
    if (dom.commandDetailTitle) {
      dom.commandDetailTitle.textContent = "Command Details";
    }
  }
}

function populateCloneForm({
  nameInputId,
  commandInputId,
  outputInputId,
  noteInputId,
}) {
  const clone = state.pendingCommandClone;
  if (!clone) return false;

  const nameInput = document.getElementById(nameInputId);
  const commandInput = document.getElementById(commandInputId);
  const outputInput = document.getElementById(outputInputId);
  const noteInput = document.getElementById(noteInputId);

  if (!nameInput || !commandInput) return false;

  nameInput.value = clone.name || "";
  commandInput.value = clone.command || "";
  if (outputInput) {
    outputInput.value = clone.output || "";
  }
  if (noteInput) {
    noteInput.value = clone.note || "";
  }

  setupAutosizeTextarea(commandInput);
  window.setTimeout(() => {
    nameInput.focus();
    const length = nameInput.value.length;
    if (nameInput.setSelectionRange) {
      nameInput.setSelectionRange(length, length);
    }
  }, 0);

  state.pendingCommandClone = null;
  return true;
}

export function applyPendingCommandCloneToCommandsView() {
  if (!state.pendingCommandClone) return false;
  if (state.pendingCommandClone.projectId) return false;
  return populateCloneForm({
    nameInputId: "command-name",
    commandInputId: "command-text",
    outputInputId: "command-output",
    noteInputId: "command-note",
  });
}

export function applyPendingCommandCloneToProject(projectId) {
  if (!state.pendingCommandClone) return false;
  if (!state.pendingCommandClone.projectId) return false;
  if (String(state.pendingCommandClone.projectId) !== String(projectId)) {
    return false;
  }

  return populateCloneForm({
    nameInputId: "project-command-name",
    commandInputId: "project-command-text",
    outputInputId: "project-command-output",
    noteInputId: "project-command-note",
  });
}

export function renderCommandGallery(container, commands, options = {}) {
  if (!commands || commands.length === 0) {
    container.innerHTML =
      `<div class="empty-state">${escapeHtml(
        options.emptyMessage || "No commands yet.",
      )}</div>`;
    return;
  }

  container.innerHTML = commands
    .map((command) => renderCommandPreviewCard(command, options))
    .join("");
}

export function renderCommandPreviewCard(command, options = {}) {
  const createdAt = formatDate(command.created_at);
  const displayName =
    command.name && command.name.trim() ? command.name : command.command_text;
  const snippet = truncateCommandText(displayName, 64);
  const ownerLabel =
    options.showOwner && command.owner_username
      ? `Shared by ${command.owner_username}`
      : "";

  return `
      <article class="command-preview-card" data-command-id="${command.id}">
        <div class="command-preview-meta">${escapeHtml(createdAt)}</div>
        ${ownerLabel ? `<div class="command-preview-meta">${escapeHtml(ownerLabel)}</div>` : ""}
        <div class="command-preview">${escapeHtml(snippet)}</div>
      </article>
    `;
}

export function renderCommandsList(container, commands, options = {}) {
  if (!commands || commands.length === 0) {
    container.innerHTML = '<div class="empty-state">No commands yet.</div>';
    return;
  }

  container.innerHTML = commands
    .map((command) => renderCommandDetailCard(command, options))
    .join("");
  enhanceMathRendering(container);
}

export function renderCommandDetailCard(command, options = {}) {
  const createdAt = formatDate(command.created_at);
  const projectName = command.project_name
    ? `Project: ${command.project_name}`
    : "No project";
  const ownerLabel = command.owner_username
    ? `Shared by ${command.owner_username}`
    : "";
  const showCopy = options.showCopy !== false;
  const commandText = escapeHtml(command.command_text);
  const outputText = escapeHtml(command.output_text);
  const sharedWith = command.shared_with || [];
  const sharedList = sharedWith.length
    ? `<div class="command-meta"><span class="badge">Shared with: ${sharedWith
        .map(escapeHtml)
        .join(", ")}</span></div>`
    : "";
  const commandBlock = showCopy
    ? `
        <div class="output-block copy-block" data-copy-scope="command">
          <button
            type="button"
            class="copy-button"
            data-action="copy-text"
            aria-label="Copy command"
          >
            <span class="material-symbols-rounded">content_copy</span>
          </button>
          <span class="copy-content">${commandText}</span>
        </div>
      `
    : `<div class="output-block">${commandText}</div>`;
  const outputBlock = showCopy
    ? `
        <div class="output-block copy-block" data-copy-scope="output">
          <button
            type="button"
            class="copy-button"
            data-action="copy-text"
            aria-label="Copy output"
          >
            <span class="material-symbols-rounded">content_copy</span>
          </button>
          <span class="copy-content">${outputText}</span>
        </div>
      `
    : `<div class="output-block">${outputText}</div>`;

  return `
      <div class="command-card" data-command-id="${command.id}">
        <div class="command-meta">
          <span class="tag">${escapeHtml(projectName)}</span>
          <span>${escapeHtml(createdAt)}</span>
          ${ownerLabel ? `<span>${escapeHtml(ownerLabel)}</span>` : ""}
        </div>
        <div>
          <strong>Command</strong>
          ${commandBlock}
        </div>
        <div>
          <strong>Output</strong>
          ${outputBlock}
        </div>
        <div>
          <strong>Notes</strong>
          <div class="note-rendered markdown-body">${renderMarkdown(command.note_markdown)}</div>
        </div>
        ${sharedList}
      </div>
    `;
}

export function renderCommandEditForm(command) {
  return `
      <div class="command-card">
        <form id="command-edit-form" class="command-form">
          <div class="form-group">
            <label for="edit-command-name">Command Name</label>
            <input
              type="text"
              id="edit-command-name"
              value="${escapeHtml(command.name || "")}"
              autocomplete="off"
            />
          </div>
          <div class="form-group">
            <label for="edit-command-text">Command</label>
            <textarea
              id="edit-command-text"
              class="mono-input command-input"
              autocomplete="off"
              wrap="off"
              required
            >${escapeHtml(command.command_text)}</textarea>
          </div>
          <div class="form-group">
            <label for="edit-command-output">Output</label>
            <textarea
              id="edit-command-output"
              class="mono-input"
              wrap="off"
            >${escapeHtml(command.output_text)}</textarea>
          </div>
          <div class="form-group">
            <label for="edit-command-note">Notes (Markdown)</label>
            <textarea id="edit-command-note">${escapeHtml(
              command.note_markdown || "",
            )}</textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn primary-btn">Save</button>
            <button
              type="button"
              class="btn ghost-btn"
              data-action="cancel-edit"
            >
              Cancel
            </button>
          </div>
          <p id="command-edit-error" class="error-message"></p>
        </form>
      </div>
    `;
}

export async function handleCopyButton(copyBtn) {
  const block = copyBtn.closest(".copy-block");
  if (!block) return;
  const content = block.querySelector(".copy-content");
  if (!content) return;
  const text = content.textContent || "";

  try {
    await copyTextToClipboard(text);
    showCopySuccess(copyBtn);
  } catch (error) {
    console.error("Copy failed:", error);
  }
}

export function enterCommandEditMode() {
  if (
    state.activeDetailType !== "command" ||
    !state.activeCommandData ||
    !state.activeCommandData.is_owner ||
    state.isEditingCommand
  ) {
    return;
  }
  state.isEditingCommand = true;
  dom.commandDetailCard.innerHTML = renderCommandEditForm(
    state.activeCommandData,
  );
  window.setTimeout(() => {
    const input = document.getElementById("edit-command-text");
    if (input) {
      setupAutosizeTextarea(input);
      input.focus();
      input.select();
    }
  }, 0);
}

export function exitCommandEditMode() {
  if (state.activeDetailType !== "command" || !state.activeCommandData) return;
  state.isEditingCommand = false;
  dom.commandDetailCard.innerHTML = renderCommandDetailCard(
    state.activeCommandData,
  );
  enhanceMathRendering(dom.commandDetailCard);
  if (dom.commandDetailTitle) {
    dom.commandDetailTitle.textContent =
      state.activeCommandData.name && state.activeCommandData.name.trim()
        ? state.activeCommandData.name
        : "Command Details";
  }
}
