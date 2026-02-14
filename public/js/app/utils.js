export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function setupAutosizeTextarea(textarea) {
  if (!textarea) return;
  const alreadyInitialized = textarea.dataset.autosize === "true";
  if (!alreadyInitialized) {
    textarea.dataset.autosize = "true";
    textarea.addEventListener("input", () => sizeTextarea(textarea));
  }
  sizeTextarea(textarea);
}

export function sizeTextarea(textarea) {
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

export function formatDate(dateString) {
  if (!dateString) return "";
  const normalized = normalizeDateInput(dateString);
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString();
}

function normalizeDateInput(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;

  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed);
  if (hasTimezone) return trimmed;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(" ", "T")}Z`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}Z`;
  }

  return trimmed;
}

export function truncateCommandText(text, limit) {
  const safeText = String(text || "").replace(/\s+/g, " ").trim();
  if (!safeText) return "...";
  if (safeText.length <= limit) return safeText;
  const slice = safeText.slice(0, limit).trimEnd();
  return `${slice}...`;
}

export function normalizePath(pathname) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function copyTextToClipboard(text) {
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

export function showCopySuccess(copyBtn) {
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
