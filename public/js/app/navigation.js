import { dom } from "./dom.js";
import { state } from "./state.js";
import { normalizePath } from "./utils.js";
import { loadCommands, loadCommandDetail } from "./commands.js";
import {
  loadNotes,
  loadNoteDetail,
  refreshNoteCreateButton,
  stopNoteAutosave,
} from "./notes.js";
import { loadShared } from "./shared.js";
import { loadProjects, loadProjectDetail } from "./projects.js";
import { closeDeleteModal, closeShareModal } from "./modals.js";
import { setActiveTab } from "./tabs.js";

const tabPaths = {
  commands: "/my_commands",
  notes: "/notes",
  shared: "/shared",
  projects: "/projects",
};

export function initNavigation() {
  dom.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      if (!tab || !tabPaths[tab]) return;
      navigateTo(tabPaths[tab]);
    });
  });

  window.addEventListener("popstate", () => {
    handleRoute(window.location.pathname, { replace: true });
  });
}

export function handleRoute(rawPath, options = {}) {
  const path = normalizePath(rawPath);

  if (path === "/") {
    navigateTo("/my_commands", { replace: true });
    return;
  }

  if (path === "/my_commands") {
    showCommandsView();
    return;
  }

  if (path === "/notes") {
    showNotesView();
    return;
  }

  if (path === "/shared") {
    showSharedView();
    return;
  }

  if (path === "/projects") {
    showProjectsView();
    return;
  }

  const projectMatch = path.match(/^\/projects\/(\d+)$/);
  if (projectMatch) {
    showProjectDetailView(projectMatch[1]);
    return;
  }

  const noteMatch = path.match(/^\/notes\/(\d+)$/);
  if (noteMatch) {
    showNoteDetailView(noteMatch[1]);
    return;
  }

  const commandMatch = path.match(/^\/commands\/(\d+)$/);
  if (commandMatch) {
    showCommandDetailView(commandMatch[1]);
    return;
  }

  if (!options.replace) {
    navigateTo("/my_commands", { replace: true });
  }
}

export function navigateTo(path, options = {}) {
  if (options.replace) {
    window.history.replaceState({}, "", path);
  } else {
    window.history.pushState({}, "", path);
  }
  handleRoute(path, { replace: true });
}

export function showView(viewKey) {
  closeShareModal();
  closeDeleteModal();
  stopNoteAutosave();
  if (viewKey !== "commandDetail") {
    state.isEditingCommand = false;
    state.isPreviewingNote = false;
    state.activeDetailType = null;
  }
  Object.entries(dom.views).forEach(([key, view]) => {
    view.classList.toggle("hidden", key !== viewKey);
  });
}

export function showCommandsView() {
  setActiveTab("commands");
  showView("commands");
  loadCommands();
}

export function showNotesView() {
  setActiveTab("notes");
  showView("notes");
  refreshNoteCreateButton();
  loadNotes();
}

export function showSharedView() {
  setActiveTab("shared");
  showView("shared");
  loadShared();
}

export function showProjectsView() {
  setActiveTab("projects");
  showView("projects");
  loadProjects();
}

export function showProjectDetailView(projectId) {
  setActiveTab("projects");
  showView("projectDetail");
  loadProjectDetail(projectId);
}

export function showCommandDetailView(commandId) {
  setActiveTab("commands");
  showView("commandDetail");
  loadCommandDetail(commandId);
}

export function showNoteDetailView(noteId) {
  setActiveTab("notes");
  showView("commandDetail");
  loadNoteDetail(noteId);
}

export function handleBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  navigateTo(state.detailFallbackPath, { replace: true });
}
