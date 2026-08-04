import "./library.js";
import "./backup.js";
import { refresh as refreshWorkoutBuilder } from "./workout-builder.js";
import { refresh as refreshHistory } from "./history.js";

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
  });
});
