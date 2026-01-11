import { initDom } from "./app/dom.js";
import { initAuth } from "./app/auth.js";
import { initCommands } from "./app/commands.js";
import { initNotes } from "./app/notes.js";
import { initProjects } from "./app/projects.js";
import { initNavigation } from "./app/navigation.js";
import { bindEvents } from "./app/events.js";

document.addEventListener("DOMContentLoaded", () => {
  initDom();
  initCommands();
  initNotes();
  initProjects();
  initNavigation();
  bindEvents();
  initAuth();
});
