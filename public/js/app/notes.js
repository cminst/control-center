import { dom } from "./dom.js";
import { state } from "./state.js";
import { setDetailEditButton } from "./detailControls.js";
import {
  escapeHtml,
  formatDate,
  setupAutosizeTextarea,
  truncateCommandText,
} from "./utils.js";
import { enhanceMathRendering, renderMarkdown } from "./markdown.js";
import { setActiveTab } from "./tabs.js";
import { sortItemsByGroup } from "./grouping.js";

const NOTE_AUTOSAVE_INTERVAL = 5000;

export function initNotes() {
  setupAutosizeTextarea(dom.noteTextInput);
}

export async function handleNoteFormSubmit(event) {
  event.preventDefault();
  dom.noteError.textContent = "";
  const title = dom.noteTitleInput ? dom.noteTitleInput.value.trim() : "";
  const note = dom.noteTextInput ? dom.noteTextInput.value.trim() : "";
  if (!note) {
    dom.noteError.textContent = "Note is required.";
    return;
  }
  if (dom.noteCreateButton) {
    dom.noteCreateButton.disabled = true;
  }
  try {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: title || null,
        note,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      dom.noteForm.reset();
      setupAutosizeTextarea(dom.noteTextInput);
      await loadNotes();
    } else {
      dom.noteError.textContent = data.error || "Failed to create note";
    }
  } catch (error) {
    console.error("Note create error:", error);
    dom.noteError.textContent = "An error occurred. Please try again.";
  } finally {
    refreshNoteCreateButton();
  }
}

export function handleNoteFormInput() {
  dom.noteError.textContent = "";
  refreshNoteCreateButton();
}

export function refreshNoteCreateButton() {
  if (!dom.noteCreateButton) return;
  const note = dom.noteTextInput ? dom.noteTextInput.value.trim() : "";
  dom.noteCreateButton.disabled = !note;
}

export async function loadNotes() {
  try {
    const response = await fetch("/api/notes");
    const data = await response.json();
    if (response.ok) {
      renderNoteGallery(dom.noteGallery, data, {
        enableLinking: true,
      });
    }
  } catch (error) {
    console.error("Load notes error:", error);
  }
}

export async function loadNoteDetail(noteId) {
  dom.commandDetailCard.innerHTML = "";
  dom.commandBreadcrumb.textContent = "Notes";
  if (dom.commandDetailTitle) {
    dom.commandDetailTitle.textContent = "Note";
  }
  state.activeNoteId = noteId;
  state.activeNoteData = null;
  state.isPreviewingNote = true;
  state.activeDetailType = "note";
  state.detailFallbackPath = "/notes";

  try {
    const response = await fetch(`/api/notes/${noteId}`);
    const data = await response.json();
    if (!response.ok) {
      dom.commandDetailCard.innerHTML =
        '<div class="empty-state">Note not found.</div>';
      dom.commandShareButton.classList.add("hidden");
      dom.commandEditButton.classList.add("hidden");
      if (dom.commandCloneButton) {
        dom.commandCloneButton.classList.add("hidden");
      }
      dom.commandDeleteButton.classList.add("hidden");
      state.detailFallbackPath = "/notes";
      return;
    }

    state.activeNoteData = data;
    state.isPreviewingNote = true;
    state.detailNoteLastSaved = {
      title: data.name || "",
      note: data.note_markdown || "",
    };
    renderNoteDetail();

    dom.commandShareButton.classList.toggle("hidden", !data.is_owner);
    dom.commandEditButton.classList.toggle("hidden", !data.is_owner);
    if (dom.commandCloneButton) {
      dom.commandCloneButton.classList.add("hidden");
    }
    dom.commandDeleteButton.classList.toggle("hidden", !data.is_owner);

    state.detailFallbackPath = "/notes";
    setActiveTab("notes");
  } catch (error) {
    console.error("Load note detail error:", error);
    dom.commandDetailCard.innerHTML =
      '<div class="empty-state">Unable to load note.</div>';
    dom.commandShareButton.classList.add("hidden");
    dom.commandEditButton.classList.add("hidden");
    if (dom.commandCloneButton) {
      dom.commandCloneButton.classList.add("hidden");
    }
    dom.commandDeleteButton.classList.add("hidden");
    if (dom.commandDetailTitle) {
      dom.commandDetailTitle.textContent = "Note";
    }
  }
}

export function getNoteTitle(note) {
  const name = note?.name ? note.name.trim() : "";
  if (name) return name;
  const snippet = truncateCommandText(note?.note_markdown || "", 40);
  return snippet === "..." ? "Note" : snippet;
}

export function renderNoteDetail() {
  if (!state.activeNoteData) return;

  if (dom.commandDetailTitle) {
    dom.commandDetailTitle.textContent = getNoteTitle(state.activeNoteData);
  }

  if (state.isPreviewingNote) {
    dom.commandDetailCard.innerHTML = renderNoteDetailPreview(
      state.activeNoteData,
    );
    enhanceMathRendering(dom.commandDetailCard);
  } else {
    dom.commandDetailCard.innerHTML = renderNoteEditForm(state.activeNoteData);
    window.setTimeout(() => {
      const input = document.getElementById("note-edit-text");
      if (input) {
        setupAutosizeTextarea(input);
        input.focus();
      }
    }, 0);
  }

  setDetailEditButton({
    icon: state.isPreviewingNote ? "edit" : "visibility",
    label: state.isPreviewingNote ? "Edit note" : "Preview note",
    shareScope: "note",
  });

  if (state.activeNoteData.is_owner && !state.isPreviewingNote) {
    startNoteAutosave("detail");
  } else {
    stopNoteAutosave();
  }
}

export function toggleNotePreview() {
  if (!state.activeNoteData || !state.activeNoteData.is_owner) return;
  if (!state.isPreviewingNote) {
    syncNoteEditToState();
    performNoteAutosave({ mode: "detail", force: true });
  }
  state.isPreviewingNote = !state.isPreviewingNote;
  renderNoteDetail();
}

export function renderNoteGallery(container, notes, options = {}) {
  if (!notes || notes.length === 0) {
    container.innerHTML =
      `<div class="empty-state">${escapeHtml(
        options.emptyMessage || "No notes yet.",
      )}</div>`;
    return;
  }

  const ordered = sortItemsByGroup(notes);
  container.innerHTML = ordered
    .map((note) => renderNotePreviewCard(note, options))
    .join("");
}

export function renderNotePreviewCard(note, options = {}) {
  const createdAt = formatDate(note.created_at);
  const title = getNoteTitle(note);
  const ownerLabel =
    options.showOwner && note.owner_username
      ? `Shared by ${note.owner_username}`
      : "";
  const groupIdAttr = note.group_id ? ` data-group-id="${note.group_id}"` : "";
  const groupColorAttr = note.group_color
    ? ` data-group-color="${escapeHtml(note.group_color)}"`
    : "";
  const groupClass = note.group_id ? " grouped" : "";
  const draggableAttr = options.enableLinking ? ' draggable="true"' : "";

  return `
      <article class="command-preview-card${groupClass}" data-note-id="${note.id}"${groupIdAttr}${groupColorAttr}${draggableAttr}>
        <div class="command-preview-meta">${escapeHtml(createdAt)}</div>
        ${ownerLabel ? `<div class="command-preview-meta">${escapeHtml(ownerLabel)}</div>` : ""}
        <div class="command-preview">${escapeHtml(title)}</div>
      </article>
    `;
}

export function renderNoteDetailPreview(note) {
  return `
      <div class="command-card">
        <div class="note-rendered markdown-body">${renderMarkdown(
          note.note_markdown,
        )}</div>
      </div>
    `;
}

export function renderNoteEditForm(note) {
  return `
      <div class="command-card">
        <form id="note-edit-form" class="command-form note-form">
          <div class="form-group">
            <label for="note-edit-title">Title</label>
            <input
              type="text"
              id="note-edit-title"
              value="${escapeHtml(note.name || "")}"
              autocomplete="off"
            />
          </div>
          <div class="form-group note-body">
            <textarea
              id="note-edit-text"
              class="mono-input note-textarea"
              placeholder="Write a markdown note..."
              aria-label="Note markdown"
              autocomplete="off"
              wrap="soft"
              required
            >${escapeHtml(note.note_markdown || "")}</textarea>
          </div>
          <p id="note-edit-error" class="error-message"></p>
        </form>
      </div>
    `;
}

export function handleNoteEditSubmit() {
  performNoteAutosave({ mode: "detail", force: true });
}

export function handleNoteEditInput(event) {
  if (state.activeDetailType !== "note") return;
  if (
    event.target.id !== "note-edit-title" &&
    event.target.id !== "note-edit-text"
  ) {
    return;
  }
  const titleInput = document.getElementById("note-edit-title");
  const noteInput = document.getElementById("note-edit-text");
  if (state.activeNoteData) {
    state.activeNoteData.name = titleInput ? titleInput.value : "";
    state.activeNoteData.note_markdown = noteInput ? noteInput.value : "";
  }
  if (dom.commandDetailTitle) {
    dom.commandDetailTitle.textContent = getNoteTitle(state.activeNoteData);
  }
  const errorEl = document.getElementById("note-edit-error");
  if (errorEl) {
    errorEl.textContent = "";
  }
  markNoteAutosaveDirty("detail");
}

function getNewNoteDraftValues() {
  return {
    title: dom.noteTitleInput ? dom.noteTitleInput.value.trim() : "",
    note: dom.noteTextInput ? dom.noteTextInput.value.trim() : "",
  };
}

function getDetailNoteDraftValues() {
  const titleInput = document.getElementById("note-edit-title");
  const noteInput = document.getElementById("note-edit-text");
  return {
    title: titleInput ? titleInput.value.trim() : "",
    note: noteInput ? noteInput.value.trim() : "",
  };
}

function noteValuesChanged(next, prev) {
  return next.title !== prev.title || next.note !== prev.note;
}

export function startNoteAutosave(mode) {
  if (state.noteAutosaveMode !== mode) {
    state.noteAutosaveMode = mode;
    state.noteAutosaveDirty = false;
    state.noteAutosavePending = false;
  }
  if (!state.noteAutosaveTimer) {
    state.noteAutosaveTimer = window.setInterval(() => {
      performNoteAutosave();
    }, NOTE_AUTOSAVE_INTERVAL);
  }
}

export function stopNoteAutosave() {
  if (state.noteAutosaveTimer) {
    window.clearInterval(state.noteAutosaveTimer);
  }
  state.noteAutosaveTimer = null;
  state.noteAutosaveMode = null;
  state.noteAutosaveDirty = false;
  state.noteAutosavePending = false;
}

export function markNoteAutosaveDirty(mode) {
  state.noteAutosaveMode = mode;
  state.noteAutosaveDirty = true;
  startNoteAutosave(mode);
}

export function syncNoteEditToState() {
  if (state.activeDetailType !== "note" || !state.activeNoteData) return;
  const draft = getDetailNoteDraftValues();
  state.activeNoteData = {
    ...state.activeNoteData,
    name: draft.title,
    note_markdown: draft.note,
  };
  if (dom.commandDetailTitle) {
    dom.commandDetailTitle.textContent = getNoteTitle(state.activeNoteData);
  }
}

export async function performNoteAutosave({ mode, force = false } = {}) {
  const targetMode = mode || state.noteAutosaveMode;
  if (!targetMode) return;
  state.noteAutosaveMode = targetMode;
  if (state.noteAutosavePending) return;
  if (!state.noteAutosaveDirty && !force) return;

  if (targetMode === "new") {
    await saveNewNoteDraft(force);
    return;
  }

  if (targetMode === "detail") {
    await saveDetailNoteDraft(force);
  }
}

async function saveNewNoteDraft(force) {
  const draft = getNewNoteDraftValues();
  if (!draft.title && !draft.note) {
    state.noteAutosaveDirty = false;
    return;
  }
  if (!draft.note) {
    state.noteAutosaveDirty = false;
    return;
  }
  if (
    state.newNoteDraftId &&
    !noteValuesChanged(draft, state.newNoteLastSaved) &&
    !force
  ) {
    state.noteAutosaveDirty = false;
    return;
  }

  state.noteAutosavePending = true;
  try {
    const response = await fetch(
      state.newNoteDraftId ? `/api/notes/${state.newNoteDraftId}` : "/api/notes",
      {
        method: state.newNoteDraftId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.title || null,
          note: draft.note,
        }),
      },
    );

    const data = await response.json();
    if (response.ok) {
      state.newNoteDraftId = data.id || state.newNoteDraftId;
      state.newNoteLastSaved = {
        title: data.name || draft.title || "",
        note: data.note_markdown || draft.note,
      };
      dom.noteError.textContent = "";
      await loadNotes();
    } else {
      dom.noteError.textContent = data.error || "Failed to save note";
    }
  } catch (error) {
    console.error("Note autosave error:", error);
    dom.noteError.textContent = "An error occurred. Please try again.";
  } finally {
    state.noteAutosavePending = false;
    const current = getNewNoteDraftValues();
    state.noteAutosaveDirty = noteValuesChanged(current, state.newNoteLastSaved);
  }
}

async function saveDetailNoteDraft(force) {
  if (
    !state.activeNoteId ||
    !state.activeNoteData ||
    !state.activeNoteData.is_owner ||
    state.isPreviewingNote
  ) {
    return;
  }

  const draft = getDetailNoteDraftValues();
  if (!draft.note) {
    const errorEl = document.getElementById("note-edit-error");
    if (errorEl) {
      errorEl.textContent = "Note is required.";
    }
    state.noteAutosaveDirty = false;
    return;
  }
  if (!noteValuesChanged(draft, state.detailNoteLastSaved) && !force) {
    state.noteAutosaveDirty = false;
    return;
  }

  state.noteAutosavePending = true;
  try {
    const response = await fetch(`/api/notes/${state.activeNoteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.title || null,
        note: draft.note,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      state.activeNoteData = data;
      state.detailNoteLastSaved = {
        title: data.name || draft.title || "",
        note: data.note_markdown || draft.note,
      };
      if (dom.commandDetailTitle) {
        dom.commandDetailTitle.textContent = getNoteTitle(state.activeNoteData);
      }
    } else {
      const errorEl = document.getElementById("note-edit-error");
      if (errorEl) {
        errorEl.textContent = data.error || "Failed to update note";
      }
    }
  } catch (error) {
    console.error("Note autosave error:", error);
    const errorEl = document.getElementById("note-edit-error");
    if (errorEl) {
      errorEl.textContent = "An error occurred. Please try again.";
    }
  } finally {
    state.noteAutosavePending = false;
    const current = getDetailNoteDraftValues();
    state.noteAutosaveDirty = noteValuesChanged(
      current,
      state.detailNoteLastSaved,
    );
  }
}
