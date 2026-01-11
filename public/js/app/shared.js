import { dom } from "./dom.js";
import { renderCommandGallery } from "./commands.js";
import { renderNoteGallery } from "./notes.js";
import { renderProjectGallery } from "./projects.js";

export async function loadShared() {
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
      renderCommandGallery(dom.sharedCommandList, commands, {
        emptyMessage: "No shared commands yet.",
        showOwner: true,
      });
    }
    if (noteResponse.ok) {
      renderNoteGallery(dom.sharedNoteList, notes, {
        emptyMessage: "No shared notes yet.",
        showOwner: true,
      });
    }
    if (projectResponse.ok) {
      const sharedProjects = (projects || []).map((project) => ({
        ...project,
        is_shared: true,
      }));
      renderProjectGallery(dom.sharedProjectList, sharedProjects, {
        emptyMessage: "No shared projects yet.",
      });
    }
  } catch (error) {
    console.error("Load shared error:", error);
  }
}
