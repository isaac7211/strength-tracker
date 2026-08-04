import { loadData, saveData } from "./storage.js";
import { loadAsTemplate } from "./workout-builder.js";

const listView = document.getElementById("history-list-view");
const detailView = document.getElementById("history-detail-view");
const list = document.getElementById("history-list");
const emptyState = document.getElementById("history-empty");
const backBtn = document.getElementById("history-back-btn");
const useTemplateBtn = document.getElementById("history-use-template-btn");
const detailName = document.getElementById("history-detail-name");
const detailDate = document.getElementById("history-detail-date");
const detailRounds = document.getElementById("history-detail-rounds");
const deleteSection = document.getElementById("history-delete-section");

let currentWorkout = null;
let deleteState = "idle"; // "idle" | "confirm"

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function movementName(movements, movementId) {
  const movement = movements.find((m) => m.id === movementId);
  return movement ? movement.name : "(deleted movement)";
}

function setLine(set, index) {
  const weight = set.weight !== "" && set.weight != null ? `${set.weight}` : "bodyweight";
  const reps = set.reps !== "" && set.reps != null ? set.reps : "?";
  return `Set ${index + 1}: ${weight} × ${reps} reps`;
}

export function renderList() {
  const data = loadData();
  const workouts = [...data.workouts].sort((a, b) => new Date(b.date) - new Date(a.date));

  list.innerHTML = "";
  emptyState.classList.toggle("hidden", workouts.length > 0);

  for (const workout of workouts) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-item";
    const name = document.createElement("p");
    name.className = "name";
    name.textContent = workout.name;
    const date = document.createElement("p");
    date.className = "date";
    date.textContent = formatDate(workout.date);
    btn.appendChild(name);
    btn.appendChild(date);
    btn.addEventListener("click", () => showDetail(workout.id));
    li.appendChild(btn);
    list.appendChild(li);
  }
}

function showDetail(workoutId) {
  const data = loadData();
  const workout = data.workouts.find((w) => w.id === workoutId);
  if (!workout) return;
  currentWorkout = workout;
  deleteState = "idle";
  renderDeleteSection();

  detailName.textContent = workout.name;
  detailDate.textContent = formatDate(workout.date);
  detailRounds.innerHTML = "";

  workout.rounds.forEach((round, roundIndex) => {
    const roundEl = document.createElement("div");
    roundEl.className = "detail-round";
    const h3 = document.createElement("h3");
    h3.textContent = `Round ${roundIndex + 1}`;
    roundEl.appendChild(h3);

    round.entries.forEach((entry) => {
      const entryEl = document.createElement("div");
      entryEl.className = "detail-entry";
      const nameEl = document.createElement("span");
      nameEl.className = "entry-name";
      nameEl.textContent = movementName(data.movements, entry.movementId);
      entryEl.appendChild(nameEl);

      entry.sets.forEach((set, setIndex) => {
        const line = document.createElement("p");
        line.className = "set-line";
        line.textContent = setLine(set, setIndex);
        entryEl.appendChild(line);
      });

      roundEl.appendChild(entryEl);
    });

    detailRounds.appendChild(roundEl);
  });

  listView.classList.add("hidden");
  detailView.classList.remove("hidden");
}

function renderDeleteSection() {
  deleteSection.innerHTML = "";

  if (deleteState === "confirm") {
    const warning = document.createElement("p");
    warning.className = "delete-warning";
    warning.textContent = "Are you sure? This can't be undone.";
    deleteSection.appendChild(warning);

    const row = document.createElement("div");
    row.className = "field-row";
    const cancelDeleteBtn = document.createElement("button");
    cancelDeleteBtn.type = "button";
    cancelDeleteBtn.className = "secondary";
    cancelDeleteBtn.textContent = "Cancel";
    cancelDeleteBtn.addEventListener("click", () => {
      deleteState = "idle";
      renderDeleteSection();
    });
    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "danger";
    confirmBtn.textContent = "Delete workout";
    confirmBtn.addEventListener("click", confirmDeleteWorkout);
    row.appendChild(cancelDeleteBtn);
    row.appendChild(confirmBtn);
    deleteSection.appendChild(row);
  } else {
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger";
    deleteBtn.textContent = "Delete workout";
    deleteBtn.addEventListener("click", () => {
      deleteState = "confirm";
      renderDeleteSection();
    });
    deleteSection.appendChild(deleteBtn);
  }
}

function confirmDeleteWorkout() {
  if (!currentWorkout) return;
  const data = loadData();
  data.workouts = data.workouts.filter((w) => w.id !== currentWorkout.id);
  saveData(data);
  currentWorkout = null;
  deleteState = "idle";
  detailView.classList.add("hidden");
  listView.classList.remove("hidden");
  renderList();
}

backBtn.addEventListener("click", () => {
  detailView.classList.add("hidden");
  listView.classList.remove("hidden");
});

useTemplateBtn.addEventListener("click", () => {
  if (!currentWorkout) return;
  loadAsTemplate(currentWorkout);
  document.querySelector('.tab-btn[data-tab="workout"]').click();
});

export function refresh() {
  listView.classList.remove("hidden");
  detailView.classList.add("hidden");
  renderList();
}
