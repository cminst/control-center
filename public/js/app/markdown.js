import { escapeHtml } from "./utils.js";

const markdownRenderer = window.markdownit
  ? window.markdownit({ linkify: true })
  : null;

const katexPlugin =
  (window.markdownitKatex && window.markdownitKatex.default) ||
  window.markdownitKatex;

if (markdownRenderer && katexPlugin) {
  markdownRenderer.use(katexPlugin, {
    throwOnError: false,
    errorColor: "#cc0000",
  });
}

export function renderMarkdown(markdownText) {
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

export function enhanceMathRendering(scope) {
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
