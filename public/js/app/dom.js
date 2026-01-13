export const dom = {};

export function initDom() {
  dom.authContainer = document.getElementById("auth-container");
  dom.appContainer = document.getElementById("app-container");
  dom.loginForm = document.getElementById("login-form");
  dom.registerForm = document.getElementById("register-form");
  dom.loginTab = document.getElementById("login-tab");
  dom.registerTab = document.getElementById("register-tab");
  dom.loginError = document.getElementById("login-error");
  dom.registerError = document.getElementById("register-error");
  dom.usernameDisplay = document.getElementById("username-display");
  dom.logoutBtn = document.getElementById("logout-btn");
  dom.commandForm = document.getElementById("command-form");
  dom.commandError = document.getElementById("command-error");
  dom.commandGallery = document.getElementById("command-gallery");
  dom.noteForm = document.getElementById("note-form");
  dom.noteError = document.getElementById("note-error");
  dom.noteGallery = document.getElementById("note-gallery");
  dom.sharedCommandList = document.getElementById("shared-command-list");
  dom.sharedNoteList = document.getElementById("shared-note-list");
  dom.sharedProjectList = document.getElementById("shared-project-list");
  dom.projectForm = document.getElementById("project-form");
  dom.projectError = document.getElementById("project-error");
  dom.projectGallery = document.getElementById("project-gallery");
  dom.projectDetailTitle = document.getElementById("project-detail-title");
  dom.projectBreadcrumb = document.getElementById("project-breadcrumb");
  dom.projectCommandForm = document.getElementById("project-command-form");
  dom.projectCommandError = document.getElementById("project-command-error");
  dom.projectCommandGallery = document.getElementById("project-command-gallery");
  dom.projectCommandCard = document.getElementById("project-command-card");
  dom.commandTextInput = document.getElementById("command-text");
  dom.noteTitleInput = document.getElementById("note-title");
  dom.noteTextInput = document.getElementById("note-text");
  dom.noteCreateButton = document.getElementById("note-create-button");
  dom.projectCommandTextInput = document.getElementById("project-command-text");
  dom.projectShareButton = document.getElementById("project-share-button");
  dom.projectDeleteButton = document.getElementById("project-delete-button");
  dom.commandDetailCard = document.getElementById("command-detail-card");
  dom.commandBreadcrumb = document.getElementById("command-breadcrumb");
  dom.commandDetailTitle = document.getElementById("command-detail-title");
  dom.commandEditButton = document.getElementById("command-edit-button");
  dom.commandCloneButton = document.getElementById("command-clone-button");
  dom.commandShareButton = document.getElementById("command-share-button");
  dom.commandDeleteButton = document.getElementById("command-delete-button");
  dom.shareModal = document.getElementById("share-modal");
  dom.shareModalTitle = document.getElementById("share-modal-title");
  dom.shareModalInput = document.getElementById("share-modal-input");
  dom.shareModalStatus = document.getElementById("share-modal-status");
  dom.shareModalSubmit = document.getElementById("share-modal-submit");
  dom.deleteModal = document.getElementById("delete-modal");
  dom.deleteModalTitle = document.getElementById("delete-modal-title");
  dom.deleteModalDescription = document.getElementById(
    "delete-modal-description",
  );
  dom.deleteModalStatus = document.getElementById("delete-modal-status");
  dom.deleteModalConfirm = document.getElementById("delete-modal-confirm");
  dom.tabButtons = Array.from(document.querySelectorAll(".app-tabs .tab-btn"));
  dom.views = {
    commands: document.getElementById("commands-view"),
    notes: document.getElementById("notes-view"),
    shared: document.getElementById("shared-view"),
    projects: document.getElementById("projects-view"),
    projectDetail: document.getElementById("project-detail-view"),
    commandDetail: document.getElementById("command-detail-view"),
  };
}
