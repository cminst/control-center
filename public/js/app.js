document.addEventListener("DOMContentLoaded", () => {
  const authContainer = document.getElementById("auth-container");
  const appContainer = document.getElementById("app-container");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginTab = document.getElementById("login-tab");
  const registerTab = document.getElementById("register-tab");
  const loginError = document.getElementById("login-error");
  const registerError = document.getElementById("register-error");
  const usernameDisplay = document.getElementById("username-display");
  const logoutBtn = document.getElementById("logout-btn");
  const commandForm = document.getElementById("command-form");
  const commandError = document.getElementById("command-error");
  const commandGallery = document.getElementById("command-gallery");
  const noteForm = document.getElementById("note-form");
  const noteError = document.getElementById("note-error");
  const noteGallery = document.getElementById("note-gallery");
  const sharedCommandList = document.getElementById("shared-command-list");
  const sharedNoteList = document.getElementById("shared-note-list");
  const sharedProjectList = document.getElementById("shared-project-list");
  const projectForm = document.getElementById("project-form");
  const projectError = document.getElementById("project-error");
  const projectGallery = document.getElementById("project-gallery");
  const projectDetailTitle = document.getElementById("project-detail-title");
  const projectBreadcrumb = document.getElementById("project-breadcrumb");
  const projectCommandForm = document.getElementById("project-command-form");
  const projectCommandError = document.getElementById("project-command-error");
  const projectCommandGallery = document.getElementById("project-command-gallery");
  const projectCommandCard = document.getElementById("project-command-card");
  const commandTextInput = document.getElementById("command-text");
  const noteTitleInput = document.getElementById("note-title");
  const noteTextInput = document.getElementById("note-text");
  const noteCreateButton = document.getElementById("note-create-button");
  const projectCommandTextInput = document.getElementById("project-command-text");
  const projectShareButton = document.getElementById("project-share-button");
  const commandDetailCard = document.getElementById("command-detail-card");
  const commandBreadcrumb = document.getElementById("command-breadcrumb");
  const commandDetailTitle = document.getElementById("command-detail-title");
  const commandEditButton = document.getElementById("command-edit-button");
  const commandShareButton = document.getElementById("command-share-button");
  const commandDeleteButton = document.getElementById("command-delete-button");
  const shareModal = document.getElementById("share-modal");
  const shareModalTitle = document.getElementById("share-modal-title");
  const shareModalInput = document.getElementById("share-modal-input");
  const shareModalStatus = document.getElementById("share-modal-status");
  const shareModalSubmit = document.getElementById("share-modal-submit");
  const deleteModal = document.getElementById("delete-modal");
  const deleteModalDescription = document.getElementById(
    "delete-modal-description",
  );
  const deleteModalStatus = document.getElementById("delete-modal-status");
  const deleteModalConfirm = document.getElementById("delete-modal-confirm");
  const tabButtons = document.querySelectorAll(".app-tabs .tab-btn");
  const views = {
    commands: document.getElementById("commands-view"),
    notes: document.getElementById("notes-view"),
    shared: document.getElementById("shared-view"),
    projects: document.getElementById("projects-view"),
    projectDetail: document.getElementById("project-detail-view"),
    commandDetail: document.getElementById("command-detail-view"),
  };

  let currentUser = null;
  let activeProjectId = null;
  let activeCommandId = null;
  let activeCommandData = null;
  let activeNoteId = null;
  let activeNoteData = null;
  let detailFallbackPath = "/my_commands";
  let activeShareContext = null;
  let activeDeleteContext = null;
  let isEditingCommand = false;
  let isPreviewingNote = false;
  let activeDetailType = null;
  let noteAutosaveTimer = null;
  let noteAutosaveMode = null;
  let noteAutosaveDirty = false;
  let noteAutosavePending = false;
  let newNoteDraftId = null;
  let newNoteLastSaved = { title: "", note: "" };
  let detailNoteLastSaved = { title: "", note: "" };

  const markdownRenderer = window.markdownit
    ? window.markdownit({ linkify: true })
    : null;

  const NOTE_AUTOSAVE_INTERVAL = 5000;

  const katexPlugin =
    (window.markdownitKatex && window.markdownitKatex.default) ||
    window.markdownitKatex;

  if (markdownRenderer && katexPlugin) {
    markdownRenderer.use(katexPlugin, {
      throwOnError: false,
      errorColor: "#cc0000",
    });
  }

  const tabPaths = {
    commands: "/my_commands",
    notes: "/notes",
    shared: "/shared",
    projects: "/projects",
  };

  loginTab.addEventListener("click", () => {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    loginError.textContent = "";
    registerError.textContent = "";
  });

  registerTab.addEventListener("click", () => {
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    loginError.textContent = "";
    registerError.textContent = "";
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      if (!tab || !tabPaths[tab]) return;
      navigateTo(tabPaths[tab]);
    });
  });

  setupAutosizeTextarea(commandTextInput);
  setupAutosizeTextarea(noteTextInput);
  setupAutosizeTextarea(projectCommandTextInput);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        currentUser = data.username;
        showApp();
      } else {
        loginError.textContent = data.error || "Login failed";
      }
    } catch (error) {
      console.error("Login error:", error);
      loginError.textContent = "An error occurred. Please try again.";
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    registerError.textContent = "";

    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value.trim();

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        currentUser = data.username;
        showApp();
      } else {
        registerError.textContent = data.error || "Registration failed";
      }
    } catch (error) {
      console.error("Register error:", error);
      registerError.textContent = "An error occurred. Please try again.";
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    }
    showAuth();
  });

  commandForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    commandError.textContent = "";

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
        commandForm.reset();
        setupAutosizeTextarea(commandTextInput);
        await loadCommands();
      } else {
        commandError.textContent = data.error || "Failed to save command";
      }
    } catch (error) {
      console.error("Command error:", error);
      commandError.textContent = "An error occurred. Please try again.";
    }
  });

  noteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    noteError.textContent = "";
    const title = noteTitleInput ? noteTitleInput.value.trim() : "";
    const note = noteTextInput ? noteTextInput.value.trim() : "";
    if (!note) {
      noteError.textContent = "Note is required.";
      return;
    }
    if (noteCreateButton) {
      noteCreateButton.disabled = true;
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
        noteForm.reset();
        setupAutosizeTextarea(noteTextInput);
        await loadNotes();
      } else {
        noteError.textContent = data.error || "Failed to create note";
      }
    } catch (error) {
      console.error("Note create error:", error);
      noteError.textContent = "An error occurred. Please try again.";
    } finally {
      if (noteCreateButton) {
        const note = noteTextInput ? noteTextInput.value.trim() : "";
        noteCreateButton.disabled = !note;
      }
    }
  });

  noteForm.addEventListener("input", () => {
    noteError.textContent = "";
    if (!noteCreateButton) return;
    const note = noteTextInput ? noteTextInput.value.trim() : "";
    noteCreateButton.disabled = !note;
  });

  projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    projectError.textContent = "";

    const name = document.getElementById("project-name").value.trim();

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();
      if (response.ok) {
        projectForm.reset();
        await loadProjects();
      } else {
        projectError.textContent = data.error || "Failed to create project";
      }
    } catch (error) {
      console.error("Project error:", error);
      projectError.textContent = "An error occurred. Please try again.";
    }
  });

  projectCommandForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    projectCommandError.textContent = "";

    if (!activeProjectId) {
      projectCommandError.textContent = "No project selected.";
      return;
    }

    const name = document.getElementById("project-command-name").value.trim();
    const command = document
      .getElementById("project-command-text")
      .value.trim();
    const output = document.getElementById("project-command-output").value.trim();
    const note = document.getElementById("project-command-note").value.trim();

    try {
      const response = await fetch(`/api/projects/${activeProjectId}/commands`, {
        method: "POST",
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
        projectCommandForm.reset();
        setupAutosizeTextarea(projectCommandTextInput);
        await loadProjectCommands(activeProjectId);
      } else {
        projectCommandError.textContent = data.error || "Failed to save command";
      }
    } catch (error) {
      console.error("Project command error:", error);
      projectCommandError.textContent = "An error occurred. Please try again.";
    }
  });

  commandDetailCard.addEventListener("submit", async (event) => {
    const form = event.target;
    if (form.id !== "command-edit-form" && form.id !== "note-edit-form") {
      return;
    }
    event.preventDefault();

    if (form.id === "note-edit-form") {
      performNoteAutosave({ mode: "detail", force: true });
      return;
    }

    const name = document.getElementById("edit-command-name").value.trim();
    const command = document
      .getElementById("edit-command-text")
      .value.trim();
    const output = document
      .getElementById("edit-command-output")
      .value.trim();
    const note = document.getElementById("edit-command-note").value.trim();
    const errorEl = document.getElementById("command-edit-error");

    if (errorEl) {
      errorEl.textContent = "";
    }

    try {
      const response = await fetch(`/api/commands/${activeCommandId}`, {
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
        activeCommandData = data;
        isEditingCommand = false;
        commandDetailCard.innerHTML = renderCommandDetailCard(data);
        enhanceMathRendering(commandDetailCard);
        if (commandDetailTitle) {
          commandDetailTitle.textContent =
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
  });

  commandDetailCard.addEventListener("input", (event) => {
    if (activeDetailType !== "note") return;
    if (
      event.target.id !== "note-edit-title" &&
      event.target.id !== "note-edit-text"
    ) {
      return;
    }
    const titleInput = document.getElementById("note-edit-title");
    const noteInput = document.getElementById("note-edit-text");
    if (activeNoteData) {
      activeNoteData.name = titleInput ? titleInput.value : "";
      activeNoteData.note_markdown = noteInput ? noteInput.value : "";
    }
    if (commandDetailTitle) {
      commandDetailTitle.textContent = getNoteTitle(activeNoteData);
    }
    const errorEl = document.getElementById("note-edit-error");
    if (errorEl) {
      errorEl.textContent = "";
    }
    markNoteAutosaveDirty("detail");
  });

  commandGallery.addEventListener("click", (event) => {
    const card = event.target.closest("[data-command-id]");
    if (!card) return;
    navigateTo(`/commands/${card.dataset.commandId}`);
  });

  noteGallery.addEventListener("click", (event) => {
    const card = event.target.closest("[data-note-id]");
    if (!card) return;
    navigateTo(`/notes/${card.dataset.noteId}`);
  });

  sharedCommandList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-command-id]");
    if (!card) return;
    navigateTo(`/commands/${card.dataset.commandId}`);
  });

  sharedNoteList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-note-id]");
    if (!card) return;
    navigateTo(`/notes/${card.dataset.noteId}`);
  });

  projectCommandGallery.addEventListener("click", (event) => {
    const card = event.target.closest("[data-command-id]");
    if (!card) return;
    navigateTo(`/commands/${card.dataset.commandId}`);
  });

  projectGallery.addEventListener("click", (event) => {
    const card = event.target.closest("[data-project-id]");
    if (!card) return;
    navigateTo(`/projects/${card.dataset.projectId}`);
  });

  sharedProjectList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-project-id]");
    if (!card) return;
    navigateTo(`/projects/${card.dataset.projectId}`);
  });

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
      if (activeDetailType === "note") {
        toggleNotePreview();
      } else {
        enterCommandEditMode();
      }
      return;
    }

    const cancelEditBtn = event.target.closest("[data-action='cancel-edit']");
    if (cancelEditBtn) {
      exitCommandEditMode();
      return;
    }

    const openShareBtn = event.target.closest(
      "[data-action='open-share-modal']",
    );
    if (openShareBtn) {
      const scope = openShareBtn.dataset.shareScope;
      if (scope === "project" && activeProjectId) {
        openShareModal({
          scope: "project",
          targetId: activeProjectId,
          title: "Share project",
          placeholder: "Share project with username",
        });
      }
      if (scope === "command" && activeCommandId) {
        openShareModal({
          scope: "command",
          targetId: activeCommandId,
          title: "Share command",
          placeholder: "Share command with username",
        });
      }
      if (scope === "note" && activeNoteId) {
        openShareModal({
          scope: "note",
          targetId: activeNoteId,
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
      if (activeCommandId || activeNoteId) {
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

  shareModalSubmit.addEventListener("click", async () => {
    await submitShare();
  });

  shareModalInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await submitShare();
    }
  });

  deleteModalConfirm.addEventListener("click", async () => {
    await submitDelete();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeShareModal();
      closeDeleteModal();
    }
  });

  async function checkAuth() {
    try {
      const response = await fetch("/api/auth/check");
      const data = await response.json();
      if (data.authenticated) {
        currentUser = data.username;
        showApp();
      } else {
        showAuth();
      }
    } catch (error) {
      console.error("Auth check error:", error);
      showAuth();
    }
  }

  function showApp() {
    authContainer.classList.add("hidden");
    appContainer.classList.remove("hidden");
    document.body.classList.remove("auth-view");
    usernameDisplay.textContent = currentUser || "";
    handleRoute(window.location.pathname, { replace: true });
  }

  function showAuth() {
    authContainer.classList.remove("hidden");
    appContainer.classList.add("hidden");
    document.body.classList.add("auth-view");
  }

  function handleRoute(rawPath, options = {}) {
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

  function navigateTo(path, options = {}) {
    if (options.replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }
    handleRoute(path, { replace: true });
  }

  window.addEventListener("popstate", () => {
    handleRoute(window.location.pathname, { replace: true });
  });

  function showView(viewKey) {
    closeShareModal();
    closeDeleteModal();
    stopNoteAutosave();
    if (viewKey !== "commandDetail") {
      isEditingCommand = false;
      isPreviewingNote = false;
      activeDetailType = null;
    }
    Object.entries(views).forEach(([key, view]) => {
      view.classList.toggle("hidden", key !== viewKey);
    });
  }

  function setActiveTab(tabKey) {
    tabButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tabKey);
    });
  }

  function showCommandsView() {
    setActiveTab("commands");
    showView("commands");
    loadCommands();
  }

  function showNotesView() {
    setActiveTab("notes");
    showView("notes");
    if (noteCreateButton) {
      const note = noteTextInput ? noteTextInput.value.trim() : "";
      noteCreateButton.disabled = !note;
    }
    loadNotes();
  }

  function showSharedView() {
    setActiveTab("shared");
    showView("shared");
    loadShared();
  }

  function showProjectsView() {
    setActiveTab("projects");
    showView("projects");
    loadProjects();
  }

  function showProjectDetailView(projectId) {
    setActiveTab("projects");
    showView("projectDetail");
    loadProjectDetail(projectId);
  }

  function showCommandDetailView(commandId) {
    setActiveTab("commands");
    showView("commandDetail");
    loadCommandDetail(commandId);
  }

  function showNoteDetailView(noteId) {
    setActiveTab("notes");
    showView("commandDetail");
    loadNoteDetail(noteId);
  }

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    navigateTo(detailFallbackPath, { replace: true });
  }

  function openShareModal({ scope, targetId, title, placeholder }) {
    closeDeleteModal();
    activeShareContext = { scope, targetId };
    shareModalTitle.textContent = title;
    shareModalInput.placeholder = placeholder;
    shareModalInput.value = "";
    shareModalStatus.textContent = "";
    shareModal.classList.add("is-open");
    shareModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    window.setTimeout(() => {
      shareModalInput.focus();
    }, 80);
  }

  function closeShareModal() {
    if (!shareModal.classList.contains("is-open")) return;
    shareModal.classList.remove("is-open");
    shareModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    activeShareContext = null;
    shareModalStatus.textContent = "";
    shareModalInput.value = "";
  }

  function openDeleteModal() {
    closeShareModal();
    if (activeDetailType === "note") {
      activeDeleteContext = { type: "note", id: activeNoteId };
      const title = getNoteTitle(activeNoteData);
      deleteModalDescription.textContent = `Delete note "${title}"? This cannot be undone.`;
    } else {
      activeDeleteContext = { type: "command", id: activeCommandId };
      const snippet = truncateCommandText(
        activeCommandData?.command_text || "",
        48,
      );
      deleteModalDescription.textContent = `Delete "${snippet}"? This cannot be undone.`;
    }
    deleteModalStatus.textContent = "";
    deleteModal.classList.add("is-open");
    deleteModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    window.setTimeout(() => {
      deleteModalConfirm.focus();
    }, 80);
  }

  function closeDeleteModal() {
    if (!deleteModal.classList.contains("is-open")) return;
    deleteModal.classList.remove("is-open");
    deleteModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    activeDeleteContext = null;
    deleteModalStatus.textContent = "";
  }

  async function submitShare() {
    if (!activeShareContext) return;
    const username = shareModalInput.value.trim();
    if (!username) return;

    const { scope, targetId } = activeShareContext;
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
        shareModalInput.value = "";
        shareModalStatus.textContent = "Shared successfully.";
        if (scope === "command") {
          await loadCommandDetail(targetId);
        }
        if (scope === "note") {
          await loadNoteDetail(targetId);
        }
      } else {
        shareModalStatus.textContent = data.error || "Unable to share.";
      }
    } catch (error) {
      console.error("Share error:", error);
      shareModalStatus.textContent = "Unable to share.";
    }
  }

  async function submitDelete() {
    if (!activeDeleteContext) return;
    const { type, id } = activeDeleteContext;
    deleteModalStatus.textContent = "";
    deleteModalConfirm.disabled = true;

    try {
      const endpoint =
        type === "note" ? `/api/notes/${id}` : `/api/commands/${id}`;
      const response = await fetch(endpoint, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        closeDeleteModal();
        if (type === "note") {
          activeNoteData = null;
          activeNoteId = null;
          activeDetailType = null;
          isPreviewingNote = false;
          stopNoteAutosave();
          if (commandDetailCard) {
            commandDetailCard.innerHTML = "";
          }
          handleBack();
          return;
        } else {
          activeCommandData = null;
          activeCommandId = null;
        }
        handleBack();
      } else {
        deleteModalStatus.textContent =
          data.error ||
          (type === "note"
            ? "Unable to delete note."
            : "Unable to delete command.");
      }
    } catch (error) {
      console.error("Delete command error:", error);
      deleteModalStatus.textContent =
        type === "note" ? "Unable to delete note." : "Unable to delete command.";
    } finally {
      deleteModalConfirm.disabled = false;
    }
  }

  async function loadCommands() {
    try {
      const response = await fetch("/api/commands/mine");
      const data = await response.json();
      if (response.ok) {
        const soloCommands = data.filter((command) => !command.project_id);
        renderCommandGallery(commandGallery, soloCommands);
      }
    } catch (error) {
      console.error("Load commands error:", error);
    }
  }

  async function loadNotes() {
    try {
      const response = await fetch("/api/notes");
      const data = await response.json();
      if (response.ok) {
        renderNoteGallery(noteGallery, data);
      }
    } catch (error) {
      console.error("Load notes error:", error);
    }
  }

  async function loadShared() {
    try {
      const [commandResponse, noteResponse, projectResponse] =
        await Promise.all([
          fetch("/api/commands/shared"),
          fetch("/api/notes/shared"),
          fetch("/api/projects/shared"),
        ]);
      const commands = await commandResponse.json();
      const notes = await noteResponse.json();
      const projects = await projectResponse.json();

      if (commandResponse.ok) {
        renderCommandGallery(sharedCommandList, commands, {
          emptyMessage: "No shared commands yet.",
          showOwner: true,
        });
      }
      if (noteResponse.ok) {
        renderNoteGallery(sharedNoteList, notes, {
          emptyMessage: "No shared notes yet.",
          showOwner: true,
        });
      }
      if (projectResponse.ok) {
        const sharedProjects = (projects || []).map((project) => ({
          ...project,
          is_shared: true,
        }));
        renderProjectGallery(sharedProjectList, sharedProjects, {
          emptyMessage: "No shared projects yet.",
        });
      }
    } catch (error) {
      console.error("Load shared error:", error);
    }
  }

  async function loadProjects() {
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
        renderProjectGallery(projectGallery, combined, {
          emptyMessage: "No projects yet.",
        });
      }
    } catch (error) {
      console.error("Load projects error:", error);
    }
  }

  async function loadProjectDetail(projectId) {
    activeProjectId = projectId;
    projectCommandError.textContent = "";
    projectCommandGallery.innerHTML = "";

    try {
      const [projectResponse, commandsResponse] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/commands`),
      ]);

      if (!projectResponse.ok) {
        projectDetailTitle.textContent = "Project not found";
        projectCommandGallery.innerHTML =
          '<div class="empty-state">Project not found.</div>';
        projectCommandCard.classList.add("hidden");
        projectShareButton.classList.add("hidden");
        return;
      }

      const project = await projectResponse.json();
      const commands = commandsResponse.ok ? await commandsResponse.json() : [];

      projectDetailTitle.textContent = project.name || "Project";
      projectBreadcrumb.textContent = "Projects";

      const isOwner = Boolean(project.is_owner);
      projectCommandCard.classList.toggle("hidden", !isOwner);
      projectShareButton.classList.toggle("hidden", !isOwner);

      detailFallbackPath = "/projects";

      renderCommandGallery(projectCommandGallery, commands);
    } catch (error) {
      console.error("Load project detail error:", error);
      projectCommandGallery.innerHTML =
        '<div class="empty-state">Unable to load project.</div>';
    }
  }

  async function loadProjectCommands(projectId) {
    try {
      const response = await fetch(`/api/projects/${projectId}/commands`);
      const data = await response.json();
      if (response.ok) {
        renderCommandGallery(projectCommandGallery, data);
      }
    } catch (error) {
      console.error("Load project commands error:", error);
    }
  }

  async function loadCommandDetail(commandId) {
    commandDetailCard.innerHTML = "";
    commandBreadcrumb.textContent = "";
    if (commandDetailTitle) {
      commandDetailTitle.textContent = "Command Details";
    }
    activeCommandId = commandId;
    activeCommandData = null;
    isEditingCommand = false;
    activeDetailType = "command";

    try {
      const response = await fetch(`/api/commands/${commandId}`);
      const data = await response.json();
      if (!response.ok) {
        commandDetailCard.innerHTML =
          '<div class="empty-state">Command not found.</div>';
        commandShareButton.classList.add("hidden");
        commandEditButton.classList.add("hidden");
        commandDeleteButton.classList.add("hidden");
        detailFallbackPath = "/my_commands";
        return;
      }

      commandDetailCard.innerHTML = renderCommandDetailCard(data);
      enhanceMathRendering(commandDetailCard);
      activeCommandData = data;
      if (commandDetailTitle) {
        commandDetailTitle.textContent =
          data.name && data.name.trim() ? data.name : "Command Details";
      }
      setDetailEditButton({
        icon: "edit",
        label: "Edit command",
        shareScope: "command",
      });
      commandShareButton.classList.toggle("hidden", !data.is_owner);
      commandEditButton.classList.toggle("hidden", !data.is_owner);
      commandDeleteButton.classList.toggle("hidden", !data.is_owner);

      if (data.project_id && data.project_name) {
        const commandSnippet = truncateCommandText(data.command_text, 40);
        commandBreadcrumb.textContent = `Projects > ${data.project_name} > ${commandSnippet}`;
        detailFallbackPath = `/projects/${data.project_id}`;
        setActiveTab("projects");
      } else {
        commandBreadcrumb.textContent = "";
        detailFallbackPath = "/my_commands";
        setActiveTab("commands");
      }
    } catch (error) {
      console.error("Load command detail error:", error);
      commandDetailCard.innerHTML =
        '<div class="empty-state">Unable to load command.</div>';
      commandShareButton.classList.add("hidden");
      commandEditButton.classList.add("hidden");
      commandDeleteButton.classList.add("hidden");
      if (commandDetailTitle) {
        commandDetailTitle.textContent = "Command Details";
      }
    }
  }

  async function loadNoteDetail(noteId) {
    commandDetailCard.innerHTML = "";
    commandBreadcrumb.textContent = "Notes";
    if (commandDetailTitle) {
      commandDetailTitle.textContent = "Note";
    }
    activeNoteId = noteId;
    activeNoteData = null;
    isPreviewingNote = true;
    activeDetailType = "note";
    detailFallbackPath = "/notes";

    try {
      const response = await fetch(`/api/notes/${noteId}`);
      const data = await response.json();
      if (!response.ok) {
        commandDetailCard.innerHTML =
          '<div class="empty-state">Note not found.</div>';
        commandShareButton.classList.add("hidden");
        commandEditButton.classList.add("hidden");
        commandDeleteButton.classList.add("hidden");
        detailFallbackPath = "/notes";
        return;
      }

      activeNoteData = data;
      isPreviewingNote = true;
      detailNoteLastSaved = {
        title: data.name || "",
        note: data.note_markdown || "",
      };
      renderNoteDetail();

      commandShareButton.classList.toggle("hidden", !data.is_owner);
      commandEditButton.classList.toggle("hidden", !data.is_owner);
      commandDeleteButton.classList.toggle("hidden", !data.is_owner);

      detailFallbackPath = "/notes";
      setActiveTab("notes");
    } catch (error) {
      console.error("Load note detail error:", error);
      commandDetailCard.innerHTML =
        '<div class="empty-state">Unable to load note.</div>';
      commandShareButton.classList.add("hidden");
      commandEditButton.classList.add("hidden");
      commandDeleteButton.classList.add("hidden");
      if (commandDetailTitle) {
        commandDetailTitle.textContent = "Note";
      }
    }
  }

  function setDetailEditButton({ icon, label, shareScope }) {
    if (commandEditButton) {
      const iconEl = commandEditButton.querySelector(
        ".material-symbols-rounded",
      );
      if (iconEl && icon) {
        iconEl.textContent = icon;
      }
      if (label) {
        commandEditButton.setAttribute("aria-label", label);
      }
    }
    if (commandShareButton && shareScope) {
      commandShareButton.dataset.shareScope = shareScope;
    }
  }

  function getNoteTitle(note) {
    const name = note?.name ? note.name.trim() : "";
    if (name) return name;
    const snippet = truncateCommandText(note?.note_markdown || "", 40);
    return snippet === "..." ? "Note" : snippet;
  }

  function renderNoteDetail() {
    if (!activeNoteData) return;

    if (commandDetailTitle) {
      commandDetailTitle.textContent = getNoteTitle(activeNoteData);
    }

    if (isPreviewingNote) {
      commandDetailCard.innerHTML = renderNoteDetailPreview(activeNoteData);
      enhanceMathRendering(commandDetailCard);
    } else {
      commandDetailCard.innerHTML = renderNoteEditForm(activeNoteData);
      window.setTimeout(() => {
        const input = document.getElementById("note-edit-text");
        if (input) {
          setupAutosizeTextarea(input);
          input.focus();
        }
      }, 0);
    }

    setDetailEditButton({
      icon: isPreviewingNote ? "edit" : "visibility",
      label: isPreviewingNote ? "Edit note" : "Preview note",
      shareScope: "note",
    });

    if (activeNoteData.is_owner && !isPreviewingNote) {
      startNoteAutosave("detail");
    } else {
      stopNoteAutosave();
    }
  }

  function toggleNotePreview() {
    if (!activeNoteData || !activeNoteData.is_owner) return;
    if (!isPreviewingNote) {
      syncNoteEditToState();
      performNoteAutosave({ mode: "detail", force: true });
    }
    isPreviewingNote = !isPreviewingNote;
    renderNoteDetail();
  }

  function renderNoteGallery(container, notes, options = {}) {
    if (!notes || notes.length === 0) {
      container.innerHTML =
        `<div class="empty-state">${escapeHtml(
          options.emptyMessage || "No notes yet.",
        )}</div>`;
      return;
    }

    container.innerHTML = notes
      .map((note) => renderNotePreviewCard(note, options))
      .join("");
  }

  function renderNotePreviewCard(note, options = {}) {
    const createdAt = formatDate(note.created_at);
    const title = getNoteTitle(note);
    const ownerLabel =
      options.showOwner && note.owner_username
        ? `Shared by ${note.owner_username}`
        : "";

    return `
      <article class="command-preview-card" data-note-id="${note.id}">
        <div class="command-preview-meta">${escapeHtml(createdAt)}</div>
        ${ownerLabel ? `<div class="command-preview-meta">${escapeHtml(ownerLabel)}</div>` : ""}
        <div class="command-preview">${escapeHtml(title)}</div>
      </article>
    `;
  }

  function renderNoteDetailPreview(note) {
    return `
      <div class="command-card">
        <div class="note-rendered markdown-body">${renderMarkdown(
          note.note_markdown,
        )}</div>
      </div>
    `;
  }

  function renderNoteEditForm(note) {
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

  function getNewNoteDraftValues() {
    return {
      title: noteTitleInput ? noteTitleInput.value.trim() : "",
      note: noteTextInput ? noteTextInput.value.trim() : "",
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

  function startNoteAutosave(mode) {
    if (noteAutosaveMode !== mode) {
      noteAutosaveMode = mode;
      noteAutosaveDirty = false;
      noteAutosavePending = false;
    }
    if (!noteAutosaveTimer) {
      noteAutosaveTimer = window.setInterval(() => {
        performNoteAutosave();
      }, NOTE_AUTOSAVE_INTERVAL);
    }
  }

  function stopNoteAutosave() {
    if (noteAutosaveTimer) {
      window.clearInterval(noteAutosaveTimer);
    }
    noteAutosaveTimer = null;
    noteAutosaveMode = null;
    noteAutosaveDirty = false;
    noteAutosavePending = false;
  }

  function markNoteAutosaveDirty(mode) {
    noteAutosaveMode = mode;
    noteAutosaveDirty = true;
    startNoteAutosave(mode);
  }

  function syncNoteEditToState() {
    if (activeDetailType !== "note" || !activeNoteData) return;
    const draft = getDetailNoteDraftValues();
    activeNoteData = {
      ...activeNoteData,
      name: draft.title,
      note_markdown: draft.note,
    };
    if (commandDetailTitle) {
      commandDetailTitle.textContent = getNoteTitle(activeNoteData);
    }
  }

  async function performNoteAutosave({ mode, force = false } = {}) {
    const targetMode = mode || noteAutosaveMode;
    if (!targetMode) return;
    noteAutosaveMode = targetMode;
    if (noteAutosavePending) return;
    if (!noteAutosaveDirty && !force) return;

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
      noteAutosaveDirty = false;
      return;
    }
    if (!draft.note) {
      noteAutosaveDirty = false;
      return;
    }
    if (newNoteDraftId && !noteValuesChanged(draft, newNoteLastSaved) && !force) {
      noteAutosaveDirty = false;
      return;
    }

    noteAutosavePending = true;
    try {
      const response = await fetch(
        newNoteDraftId ? `/api/notes/${newNoteDraftId}` : "/api/notes",
        {
          method: newNoteDraftId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.title || null,
            note: draft.note,
          }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        newNoteDraftId = data.id || newNoteDraftId;
        newNoteLastSaved = {
          title: data.name || draft.title || "",
          note: data.note_markdown || draft.note,
        };
        noteError.textContent = "";
        await loadNotes();
      } else {
        noteError.textContent = data.error || "Failed to save note";
      }
    } catch (error) {
      console.error("Note autosave error:", error);
      noteError.textContent = "An error occurred. Please try again.";
    } finally {
      noteAutosavePending = false;
      const current = getNewNoteDraftValues();
      noteAutosaveDirty = noteValuesChanged(current, newNoteLastSaved);
    }
  }

  async function saveDetailNoteDraft(force) {
    if (
      !activeNoteId ||
      !activeNoteData ||
      !activeNoteData.is_owner ||
      isPreviewingNote
    ) {
      return;
    }

    const draft = getDetailNoteDraftValues();
    if (!draft.note) {
      const errorEl = document.getElementById("note-edit-error");
      if (errorEl) {
        errorEl.textContent = "Note is required.";
      }
      noteAutosaveDirty = false;
      return;
    }
    if (!noteValuesChanged(draft, detailNoteLastSaved) && !force) {
      noteAutosaveDirty = false;
      return;
    }

    noteAutosavePending = true;
    try {
      const response = await fetch(`/api/notes/${activeNoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.title || null,
          note: draft.note,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        activeNoteData = data;
        detailNoteLastSaved = {
          title: data.name || draft.title || "",
          note: data.note_markdown || draft.note,
        };
        if (commandDetailTitle) {
          commandDetailTitle.textContent = getNoteTitle(activeNoteData);
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
      noteAutosavePending = false;
      const current = getDetailNoteDraftValues();
      noteAutosaveDirty = noteValuesChanged(current, detailNoteLastSaved);
    }
  }

  function renderCommandGallery(container, commands, options = {}) {
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

  function renderCommandPreviewCard(command, options = {}) {
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

  function renderCommandsList(container, commands, options = {}) {
    if (!commands || commands.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No commands yet.</div>';
      return;
    }

    container.innerHTML = commands
      .map((command) => renderCommandDetailCard(command, options))
      .join("");
    enhanceMathRendering(container);
  }

  function renderCommandDetailCard(command, options = {}) {
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
      ? `<div class="command-meta"><span class=\"badge\">Shared with: ${sharedWith
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

  function renderCommandEditForm(command) {
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

  async function handleCopyButton(copyBtn) {
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

  function showCopySuccess(copyBtn) {
    const icon = copyBtn.querySelector(".material-symbols-rounded");
    if (copyBtn._copyTimeout) {
      window.clearTimeout(copyBtn._copyTimeout);
    }
    copyBtn.classList.add("copied");
    if (icon) icon.textContent = "check";
    copyBtn._copyTimeout = window.setTimeout(() => {
      copyBtn.classList.remove("copied");
      if (icon) icon.textContent = "content_copy";
    }, 1600);
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (ok) {
          resolve();
        } else {
          reject(new Error("execCommand copy failed"));
        }
      } catch (error) {
        document.body.removeChild(textarea);
        reject(error);
      }
    });
  }

  function enterCommandEditMode() {
    if (
      activeDetailType !== "command" ||
      !activeCommandData ||
      !activeCommandData.is_owner ||
      isEditingCommand
    ) {
      return;
    }
    isEditingCommand = true;
    commandDetailCard.innerHTML = renderCommandEditForm(activeCommandData);
    window.setTimeout(() => {
      const input = document.getElementById("edit-command-text");
      if (input) {
        setupAutosizeTextarea(input);
        input.focus();
        input.select();
      }
    }, 0);
  }

  function exitCommandEditMode() {
    if (activeDetailType !== "command" || !activeCommandData) return;
    isEditingCommand = false;
    commandDetailCard.innerHTML = renderCommandDetailCard(activeCommandData);
    enhanceMathRendering(commandDetailCard);
    if (commandDetailTitle) {
      commandDetailTitle.textContent =
        activeCommandData.name && activeCommandData.name.trim()
          ? activeCommandData.name
          : "Command Details";
    }
  }

  function renderProjectGallery(container, projects, options = {}) {
    if (!projects || projects.length === 0) {
      container.innerHTML =
        `<div class="empty-state">${escapeHtml(options.emptyMessage || "No projects yet.")}</div>`;
      return;
    }

    container.innerHTML = projects
      .map((project) => renderProjectTile(project, options))
      .join("");
  }

  function renderProjectTile(project, options = {}) {
    const createdAt = formatDate(project.created_at);
    const commandCount = Array.isArray(project.commands)
      ? project.commands.length
      : 0;
    const countLabel = commandCount === 1 ? "1 command" : `${commandCount} commands`;
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

  function renderMarkdown(markdownText) {
    if (!markdownText) {
      return '<p class="muted">No notes.</p>';
    }
    if (!markdownRenderer) {
      return `<pre class="note-fallback">${escapeHtml(markdownText)}</pre>`;
    }
    const normalizedMarkdown = normalizeMathDelimiters(markdownText);
    const rawHtml = markdownRenderer.render(normalizedMarkdown);
    return DOMPurify.sanitize(rawHtml);
  }

  function enhanceMathRendering(scope) {
    if (!scope || !window.renderMathInElement) return;
    const targets = scope.querySelectorAll(".note-rendered");
    targets.forEach((target) => {
      window.renderMathInElement(target, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
        throwOnError: false,
      });
    });
  }

  function normalizeMathDelimiters(markdownText) {
    let result = "";
    let inFence = false;
    let inInlineCode = false;
    let i = 0;

    while (i < markdownText.length) {
      if (!inInlineCode && markdownText.startsWith("```", i)) {
        inFence = !inFence;
        result += "```";
        i += 3;
        continue;
      }
      if (!inFence && markdownText[i] === "`") {
        inInlineCode = !inInlineCode;
        result += "`";
        i += 1;
        continue;
      }
      if (!inFence && !inInlineCode) {
        if (markdownText.startsWith("\\[", i)) {
          result += "$$";
          i += 2;
          continue;
        }
        if (markdownText.startsWith("\\]", i)) {
          result += "$$";
          i += 2;
          continue;
        }
        if (markdownText.startsWith("\\(", i)) {
          result += "$";
          i += 2;
          continue;
        }
        if (markdownText.startsWith("\\)", i)) {
          result += "$";
          i += 2;
          continue;
        }
      }
      result += markdownText[i];
      i += 1;
    }

    return result;
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setupAutosizeTextarea(textarea) {
    if (!textarea) return;
    const alreadyInitialized = textarea.dataset.autosize === "true";
    if (!alreadyInitialized) {
      textarea.dataset.autosize = "true";
      textarea.addEventListener("input", () => sizeTextarea(textarea));
    }
    sizeTextarea(textarea);
  }

  function sizeTextarea(textarea) {
    if (!textarea) return;
    const styles = window.getComputedStyle(textarea);
    const minHeight = parseFloat(styles.minHeight) || 0;
    const maxHeightValue = parseFloat(styles.maxHeight);
    const maxHeight = Number.isFinite(maxHeightValue) ? maxHeightValue : 360;

    textarea.style.height = "auto";
    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, minHeight),
      maxHeight,
    );
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleString();
  }

  function truncateCommandText(text, limit) {
    const safeText = String(text || "").replace(/\s+/g, " ").trim();
    if (!safeText) return "...";
    if (safeText.length <= limit) return safeText;
    const slice = safeText.slice(0, limit).trimEnd();
    return `${slice}...`;
  }

  function normalizePath(pathname) {
    const trimmed = pathname.replace(/\/+$/, "");
    return trimmed === "" ? "/" : trimmed;
  }

  checkAuth();
});
