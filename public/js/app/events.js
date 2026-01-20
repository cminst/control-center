import { dom } from "./dom.js";
import { state } from "./state.js";
import { handleBack, navigateTo } from "./navigation.js";
import {
  enterCommandEditMode,
  exitCommandEditMode,
  handleCommandEditSubmit,
  handleCommandFormSubmit,
  handleCopyButton,
} from "./commands.js";
import {
  handleNoteEditInput,
  handleNoteEditSubmit,
  handleNoteFormInput,
  handleNoteFormSubmit,
  toggleNotePreview,
} from "./notes.js";
import {
  handleProjectCommandFormSubmit,
  handleProjectFormSubmit,
} from "./projects.js";
import {
  closeDeleteModal,
  closeShareModal,
  openDeleteModal,
  openShareModal,
  submitDelete,
  submitShare,
} from "./modals.js";
import { initDragLinking, shouldSuppressCardClick } from "./dragLinking.js";

export function bindEvents() {
  initDragLinking();

  if (dom.commandForm) {
    dom.commandForm.addEventListener("submit", handleCommandFormSubmit);
  }

  if (dom.noteForm) {
    dom.noteForm.addEventListener("submit", handleNoteFormSubmit);
    dom.noteForm.addEventListener("input", handleNoteFormInput);
  }

  if (dom.projectForm) {
    dom.projectForm.addEventListener("submit", handleProjectFormSubmit);
  }

  if (dom.projectCommandForm) {
    dom.projectCommandForm.addEventListener(
      "submit",
      handleProjectCommandFormSubmit,
    );
  }

  if (dom.commandDetailCard) {
    dom.commandDetailCard.addEventListener("submit", async (event) => {
      const form = event.target;
      if (form.id !== "command-edit-form" && form.id !== "note-edit-form") {
        return;
      }
      event.preventDefault();

      if (form.id === "note-edit-form") {
        handleNoteEditSubmit();
        return;
      }

      await handleCommandEditSubmit();
    });

    dom.commandDetailCard.addEventListener("input", handleNoteEditInput);
  }

  if (dom.commandGallery) {
    dom.commandGallery.addEventListener("click", (event) => {
      if (shouldSuppressCardClick()) return;
      const card = event.target.closest("[data-command-id]");
      if (!card) return;
      navigateTo(`/commands/${card.dataset.commandId}`);
    });
  }

  if (dom.noteGallery) {
    dom.noteGallery.addEventListener("click", (event) => {
      if (shouldSuppressCardClick()) return;
      const card = event.target.closest("[data-note-id]");
      if (!card) return;
      navigateTo(`/notes/${card.dataset.noteId}`);
    });
  }

  if (dom.sharedCommandList) {
    dom.sharedCommandList.addEventListener("click", (event) => {
      if (shouldSuppressCardClick()) return;
      const card = event.target.closest("[data-command-id]");
      if (!card) return;
      navigateTo(`/commands/${card.dataset.commandId}`);
    });
  }

  if (dom.sharedNoteList) {
    dom.sharedNoteList.addEventListener("click", (event) => {
      if (shouldSuppressCardClick()) return;
      const card = event.target.closest("[data-note-id]");
      if (!card) return;
      navigateTo(`/notes/${card.dataset.noteId}`);
    });
  }

  if (dom.projectCommandGallery) {
    dom.projectCommandGallery.addEventListener("click", (event) => {
      if (shouldSuppressCardClick()) return;
      const card = event.target.closest("[data-command-id]");
      if (!card) return;
      navigateTo(`/commands/${card.dataset.commandId}`);
    });
  }

  if (dom.projectGallery) {
    dom.projectGallery.addEventListener("click", (event) => {
      if (shouldSuppressCardClick()) return;
      const card = event.target.closest("[data-project-id]");
      if (!card) return;
      navigateTo(`/projects/${card.dataset.projectId}`);
    });
  }

  if (dom.sharedProjectList) {
    dom.sharedProjectList.addEventListener("click", (event) => {
      if (shouldSuppressCardClick()) return;
      const card = event.target.closest("[data-project-id]");
      if (!card) return;
      navigateTo(`/projects/${card.dataset.projectId}`);
    });
  }

  document.addEventListener("click", async (event) => {
    const copyBtn = event.target.closest("[data-action='copy-text']");
    if (copyBtn) {
      event.preventDefault();
      event.stopPropagation();
      await handleCopyButton(copyBtn);
      return;
    }

    const backBtn = event.target.closest("[data-action='back']");
    if (backBtn) {
      handleBack();
      return;
    }

    const editBtn = event.target.closest("[data-action='edit-command']");
    if (editBtn) {
      if (state.activeDetailType === "note") {
        toggleNotePreview();
      } else {
        enterCommandEditMode();
      }
      return;
    }

    const cloneBtn = event.target.closest("[data-action='clone-command']");
    if (cloneBtn) {
      if (
        state.activeDetailType !== "command" ||
        !state.activeCommandData ||
        !state.activeCommandData.is_owner
      ) {
        return;
      }

      let name = state.activeCommandData.name || "";
      let command = state.activeCommandData.command_text || "";
      let output = state.activeCommandData.output_text || "";
      let note = state.activeCommandData.note_markdown || "";

      if (state.isEditingCommand) {
        const nameInput = document.getElementById("edit-command-name");
        const commandInput = document.getElementById("edit-command-text");
        const outputInput = document.getElementById("edit-command-output");
        const noteInput = document.getElementById("edit-command-note");
        name = nameInput ? nameInput.value.trim() : name;
        command = commandInput ? commandInput.value : command;
        output = outputInput ? outputInput.value : output;
        note = noteInput ? noteInput.value : note;
      }

      state.pendingCommandClone = {
        name,
        command,
        output,
        note,
        projectId: state.activeCommandData.project_id || null,
      };

      if (state.pendingCommandClone.projectId) {
        navigateTo(`/projects/${state.pendingCommandClone.projectId}`);
      } else {
        navigateTo("/my_commands");
      }
      return;
    }

    const cancelEditBtn = event.target.closest(
      "[data-action='cancel-edit']",
    );
    if (cancelEditBtn) {
      exitCommandEditMode();
      return;
    }

    const openShareBtn = event.target.closest(
      "[data-action='open-share-modal']",
    );
    if (openShareBtn) {
      const scope = openShareBtn.dataset.shareScope;
      if (scope === "project" && state.activeProjectId) {
        openShareModal({
          scope: "project",
          targetId: state.activeProjectId,
          title: "Share project",
          placeholder: "Share project with username",
        });
      }
      if (scope === "command" && state.activeCommandId) {
        openShareModal({
          scope: "command",
          targetId: state.activeCommandId,
          title: "Share command",
          placeholder: "Share command with username",
        });
      }
      if (scope === "note" && state.activeNoteId) {
        openShareModal({
          scope: "note",
          targetId: state.activeNoteId,
          title: "Share note",
          placeholder: "Share note with username",
        });
      }
      return;
    }

    const openDeleteBtn = event.target.closest(
      "[data-action='open-delete-modal']",
    );
    if (openDeleteBtn) {
      if (state.activeCommandId || state.activeNoteId || state.activeProjectId) {
        openDeleteModal();
      }
      return;
    }

    const closeShareBtn = event.target.closest(
      "[data-action='close-share-modal']",
    );
    if (closeShareBtn) {
      closeShareModal();
      return;
    }

    const closeDeleteBtn = event.target.closest(
      "[data-action='close-delete-modal']",
    );
    if (closeDeleteBtn) {
      closeDeleteModal();
    }
  });

  if (dom.shareModalSubmit) {
    dom.shareModalSubmit.addEventListener("click", async () => {
      await submitShare();
    });
  }

  if (dom.shareModalInput) {
    dom.shareModalInput.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        await submitShare();
      }
    });
  }

  if (dom.deleteModalConfirm) {
    dom.deleteModalConfirm.addEventListener("click", async () => {
      await submitDelete();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeShareModal();
      closeDeleteModal();
    }
  });
}
