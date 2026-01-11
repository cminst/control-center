import { dom } from "./dom.js";

export function setActiveTab(tabKey) {
  dom.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabKey);
  });
}
