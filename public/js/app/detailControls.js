import { dom } from "./dom.js";

export function setDetailEditButton({ icon, label, shareScope }) {
  if (dom.commandEditButton) {
    const iconEl = dom.commandEditButton.querySelector(
      ".material-symbols-rounded",
    );
    if (iconEl && icon) {
      iconEl.textContent = icon;
    }
    if (label) {
      dom.commandEditButton.setAttribute("aria-label", label);
    }
  }
  if (dom.commandShareButton && shareScope) {
    dom.commandShareButton.dataset.shareScope = shareScope;
  }
}
