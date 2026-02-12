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
  const { text, mathSegments } = extractMathSegments(markdownText);
  const rawHtml = markdownRenderer.render(text);
  const mathHtml = renderMathSegments(rawHtml, mathSegments);
  return DOMPurify.sanitize(mathHtml);
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

function extractMathSegments(markdownText) {
  let result = "";
  let inFence = false;
  let inInlineCode = false;
  let i = 0;
  const mathSegments = [];

  const pushMath = (content, display, raw) => {
    const placeholder = `@@MATH${mathSegments.length}@@`;
    mathSegments.push({ content, display, placeholder, raw });
    result += placeholder;
  };

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
      const mathMatch = matchMathStart(markdownText, i);
      if (mathMatch) {
        const { delimiter, endDelimiter, display } = mathMatch;
        const endIndex = findMathEnd(
          markdownText,
          i + delimiter.length,
          endDelimiter,
        );
        if (endIndex !== -1) {
          const content = markdownText.slice(
            i + delimiter.length,
            endIndex,
          );
          const raw = markdownText.slice(i, endIndex + endDelimiter.length);
          pushMath(content, display, raw);
          i = endIndex + endDelimiter.length;
          continue;
        }
      }
    }
    result += markdownText[i];
    i += 1;
  }

  return { text: result, mathSegments };
}

function matchMathStart(text, index) {
  if (text.startsWith("$$", index) && !isEscaped(text, index)) {
    return { delimiter: "$$", endDelimiter: "$$", display: true };
  }
  if (text.startsWith("\\[", index)) {
    return { delimiter: "\\[", endDelimiter: "\\]", display: true };
  }
  if (text.startsWith("\\(", index)) {
    return { delimiter: "\\(", endDelimiter: "\\)", display: false };
  }
  if (text[index] === "$" && text[index + 1] !== "$") {
    if (!isEscaped(text, index)) {
      return { delimiter: "$", endDelimiter: "$", display: false };
    }
  }
  return null;
}

function findMathEnd(text, startIndex, endDelimiter) {
  let i = startIndex;
  while (i < text.length) {
    if (endDelimiter.length === 2) {
      if (text.startsWith(endDelimiter, i) && !isEscaped(text, i)) {
        return i;
      }
      i += 1;
      continue;
    }
    if (text[i] === endDelimiter) {
      if (!isEscaped(text, i)) {
        return i;
      }
    }
    i += 1;
  }
  return -1;
}

function isEscaped(text, index) {
  let backslashes = 0;
  let i = index - 1;
  while (i >= 0 && text[i] === "\\") {
    backslashes += 1;
    i -= 1;
  }
  return backslashes % 2 === 1;
}

function renderMathSegments(html, mathSegments) {
  if (!mathSegments.length) return html;
  let output = html;
  mathSegments.forEach((segment) => {
    let rendered = "";
    if (window.katex && typeof window.katex.renderToString === "function") {
      try {
        rendered = window.katex.renderToString(segment.content, {
          displayMode: segment.display,
          throwOnError: false,
          errorColor: "#cc0000",
          strict: false,
        });
      } catch (error) {
        rendered = escapeHtml(segment.raw || segment.content);
      }
    } else {
      rendered = escapeHtml(segment.raw || segment.content);
    }
    output = output.split(segment.placeholder).join(rendered);
  });
  return output;
}
