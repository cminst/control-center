import { dom } from "./dom.js";
import { state } from "./state.js";
import { truncateCommandText } from "./utils.js";
import { getNoteTitle, loadNoteDetail, stopNoteAutosave } from "./notes.js";
import { loadCommandDetail } from "./commands.js";

export function openShareModal({ scope, targetId, title, placeholder }) {
  closeDeleteModal();
  state.activeShareContext = { scope, targetId };
  dom.shareModalTitle.textContent = title;
  dom.shareModalInput.placeholder = placeholder;
  dom.shareModalInput.value = "";
  dom.shareModalStatus.textContent = "";
  dom.shareModal.classList.add("is-open");
  dom.shareModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.setTimeout(() => {
    dom.shareModalInput.focus();
  }, 80);
}

export function closeShareModal() {
  if (!dom.shareModal.classList.contains("is-open")) return;
  dom.shareModal.classList.remove("is-open");
  dom.shareModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  state.activeShareContext = null;
  dom.shareModalStatus.textContent = "";
  dom.shareModalInput.value = "";
}

export function openDeleteModal() {
  closeShareModal();
  if (state.activeDetailType === "note") {
    state.activeDeleteContext = { type: "note", id: state.activeNoteId };
    const title = getNoteTitle(state.activeNoteData);
    dom.deleteModalDescription.textContent = `Delete note "${title}"? This cannot be undone.`;
  } else {
    state.activeDeleteContext = { type: "command", id: state.activeCommandId };
    const snippet = truncateCommandText(
      state.activeCommandData?.command_text || "",
      48,
    );
    dom.deleteModalDescription.textContent = `Delete "${snippet}"? This cannot be undone.`;
  }
  dom.deleteModalStatus.textContent = "";
  dom.deleteModal.classList.add("is-open");
  dom.deleteModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.setTimeout(() => {
    dom.deleteModalConfirm.focus();
  }, 80);
}

export function closeDeleteModal() {
  if (!dom.deleteModal.classList.contains("is-open")) return;
  dom.deleteModal.classList.remove("is-open");
  dom.deleteModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  state.activeDeleteContext = null;
  dom.deleteModalStatus.textContent = "";
}

export async function submitShare() {
  if (!state.activeShareContext) return;
  const username = dom.shareModalInput.value.trim();
  if (!username) return;

  const { scope, targetId } = state.activeShareContext;
  const endpoint =
    scope === "project"
      ? `/api/projects/${targetId}/share`
      : scope === "note"
        ? `/api/notes/${targetId}/share`
        : `/api/commands/${targetId}/share`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await response.json();
    if (response.ok) {
      dom.shareModalInput.value = "";
      dom.shareModalStatus.textContent = "Shared successfully.";
      if (scope === "command") {
        await loadCommandDetail(targetId);
      }
      if (scope === "note") {
        await loadNoteDetail(targetId);
      }
    } else {
      dom.shareModalStatus.textContent = data.error || "Unable to share.";
    }
  } catch (error) {
    console.error("Share error:", error);
    dom.shareModalStatus.textContent = "Unable to share.";
  }
}

export async function submitDelete() {
  if (!state.activeDeleteContext) return;
  const { type, id } = state.activeDeleteContext;
  dom.deleteModalStatus.textContent = "";
  dom.deleteModalConfirm.disabled = true;

  try {
    const endpoint =
      type === "note" ? `/api/notes/${id}` : `/api/commands/${id}`;
    const response = await fetch(endpoint, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      closeDeleteModal();
      if (type === "note") {
        state.activeNoteData = null;
        state.activeNoteId = null;
        state.activeDetailType = null;
        state.isPreviewingNote = false;
        stopNoteAutosave();
        if (dom.commandDetailCard) {
          dom.commandDetailCard.innerHTML = "";
        }
        handleBackFallback();
        return;
      } else {
        state.activeCommandData = null;
        state.activeCommandId = null;
      }
      handleBackFallback();
    } else {
      dom.deleteModalStatus.textContent =
        data.error ||
        (type === "note"
          ? "Unable to delete note."
          : "Unable to delete command.");
    }
  } catch (error) {
    console.error("Delete command error:", error);
    dom.deleteModalStatus.textContent =
      type === "note" ? "Unable to delete note." : "Unable to delete command.";
  } finally {
    dom.deleteModalConfirm.disabled = false;
  }
}

function handleBackFallback() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.history.pushState({}, "", state.detailFallbackPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
