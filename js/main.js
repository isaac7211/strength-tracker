import "./library.js";
import "./backup.js";
import { refresh as refreshWorkoutBuilder } from "./workout-builder.js";
import { refresh as refreshHistory } from "./history.js";
import { enable as enableWakeLock, disable as disableWakeLock } from "./wake-lock.js";

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabPanels.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "workout") refreshWorkoutBuilder();
    if (btn.dataset.tab === "history") refreshHistory();

    if (btn.dataset.tab === "workout") {
      enableWakeLock();
    } else {
      disableWakeLock();
    }
  });
});

if (document.querySelector('.tab-btn[data-tab="workout"]').classList.contains("active")) {
  enableWakeLock();
}
