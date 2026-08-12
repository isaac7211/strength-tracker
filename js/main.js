import "./library.js";
import "./backup.js";
import { refresh as refreshWorkoutBuilder } from "./workout-builder.js";
import { refresh as refreshHistory, highlightJustSaved } from "./history.js";
import { enable as enableWakeLock, disable as disableWakeLock } from "./wake-lock.js";

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

function activateTab(tabName) {
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === tabName));
  tabPanels.forEach((p) => p.classList.toggle("active", p.id === `tab-${tabName}`));

  if (tabName === "workout") refreshWorkoutBuilder();
  if (tabName === "history") refreshHistory();

  if (tabName === "workout") {
    enableWakeLock();
  } else {
    disableWakeLock();
  }
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

if (document.querySelector('.tab-btn[data-tab="workout"]').classList.contains("active")) {
  enableWakeLock();
}

document.addEventListener("workout:saved", (e) => {
  highlightJustSaved(e.detail.id);
  activateTab("history");
});
