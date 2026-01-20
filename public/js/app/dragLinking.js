import { dom } from "./dom.js";
import { state } from "./state.js";
import { loadCommands } from "./commands.js";
import { loadNotes } from "./notes.js";
import { loadProjectCommands } from "./projects.js";
import {
  animateGridReorder,
  captureGridPositions,
  linkGroupItems,
} from "./grouping.js";

const CARD_SELECTOR = ".command-preview-card";

let activeDrag = null;
let activeDropTarget = null;
let lastDropAt = 0;

function clearDropTarget() {
  if (activeDropTarget) {
    activeDropTarget.classList.remove("link-drop-target");
  }
  activeDropTarget = null;
}

function setDropTarget(target) {
  if (activeDropTarget === target) return;
  clearDropTarget();
  activeDropTarget = target;
  if (activeDropTarget) {
    activeDropTarget.classList.add("link-drop-target");
  }
}

function getCardId(card, datasetKey) {
  if (!card) return null;
  return card.dataset ? card.dataset[datasetKey] : null;
}

function isDraggableCard(card) {
  return card && card.getAttribute("draggable") === "true";
}

function registerLinkingGrid(container, config) {
  if (!container) return;
  const isEnabled =
    typeof config.isEnabled === "function"
      ? config.isEnabled
      : () => config.isEnabled !== false;
  const updateDraggableCards = () => {
    const enabled = isEnabled();
    container.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      if (enabled) {
        if (!card.getAttribute("draggable")) {
          card.setAttribute("draggable", "true");
        }
      } else if (card.hasAttribute("draggable")) {
        card.removeAttribute("draggable");
      }
    });
  };

  updateDraggableCards();
  const observer = new MutationObserver(() => {
    updateDraggableCards();
  });
  observer.observe(container, { childList: true, subtree: true });

  container.addEventListener("dragstart", (event) => {
    if (!isEnabled()) return;
    const card = event.target.closest(CARD_SELECTOR);
    if (!isDraggableCard(card)) return;
    const id = getCardId(card, config.datasetKey);
    if (!id) return;
    activeDrag = {
      id,
      datasetKey: config.datasetKey,
      container,
      reload: config.reload,
    };
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  });

  container.addEventListener("dragover", (event) => {
    if (!isEnabled()) return;
    if (!activeDrag || activeDrag.container !== container) return;
    const card = event.target.closest(CARD_SELECTOR);
    if (!card) return;
    const targetId = getCardId(card, config.datasetKey);
    if (!targetId || targetId === activeDrag.id) {
      clearDropTarget();
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(card);
  });

  container.addEventListener("dragleave", (event) => {
    if (!activeDrag || activeDrag.container !== container) return;
    const related = event.relatedTarget;
    if (related && container.contains(related)) return;
    clearDropTarget();
  });

  container.addEventListener("drop", async (event) => {
    if (!isEnabled()) return;
    if (!activeDrag || activeDrag.container !== container) return;
    const card = event.target.closest(CARD_SELECTOR);
    const targetId = getCardId(card, config.datasetKey);
    const sourceId = activeDrag.id;
    clearDropTarget();
    if (!targetId || targetId === sourceId) return;
    event.preventDefault();
    event.stopPropagation();

    const positions = captureGridPositions(
      container,
      CARD_SELECTOR,
      config.datasetKey,
    );
    lastDropAt = Date.now();
    try {
      await linkGroupItems(sourceId, targetId);
      if (typeof config.reload === "function") {
        await config.reload();
      }
      window.requestAnimationFrame(() => {
        animateGridReorder(
          container,
          CARD_SELECTOR,
          config.datasetKey,
          positions,
        );
      });
    } catch (error) {
      console.error("Linking error:", error);
    }
  });

  container.addEventListener("dragend", (event) => {
    const card = event.target.closest(CARD_SELECTOR);
    if (card) {
      card.classList.remove("dragging");
    }
    clearDropTarget();
    activeDrag = null;
  });
}

export function shouldSuppressCardClick() {
  return Date.now() - lastDropAt < 250;
}

export function initDragLinking() {
  registerLinkingGrid(dom.commandGallery, {
    datasetKey: "commandId",
    reload: () => loadCommands(),
    isEnabled: true,
  });

  registerLinkingGrid(dom.noteGallery, {
    datasetKey: "noteId",
    reload: () => loadNotes(),
    isEnabled: true,
  });

  registerLinkingGrid(dom.projectCommandGallery, {
    datasetKey: "commandId",
    reload: () =>
      state.activeProjectId
        ? loadProjectCommands(state.activeProjectId)
        : Promise.resolve(),
    isEnabled: () => Boolean(state.activeProjectIsOwner),
  });
}
