import { loadData, saveData, uid } from "./storage.js";

let editingId = null;
let currentDefaultSets = [];
let deleteState = "idle"; // "idle" | "confirm" | "blocked"
let blockedCount = 0;

const form = document.getElementById("movement-form");
const idField = document.getElementById("movement-id");
const nameField = document.getElementById("movement-name");
const notesField = document.getElementById("movement-notes");
const submitBtn = document.getElementById("movement-submit-btn");
const cancelBtn = document.getElementById("movement-cancel-btn");
const list = document.getElementById("movement-list");
const emptyState = document.getElementById("movement-empty");
const defaultSetsList = document.getElementById("default-sets-list");
const addDefaultSetBtn = document.getElementById("add-default-set-btn");
const deleteSection = document.getElementById("movement-delete-section");

function render() {
  const data = loadData();
  list.innerHTML = "";

  if (data.movements.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
  }

  for (const movement of data.movements) {
    const li = document.createElement("li");
    li.className = "movement-item";

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "⠷";

    const info = document.createElement("div");
    info.className = "info";
    const name = document.createElement("p");
    name.className = "name";
    name.textContent = movement.name;
    info.appendChild(name);
    if (movement.notes) {
      const notes = document.createElement("p");
      notes.className = "notes";
      notes.textContent = movement.notes;
      info.appendChild(notes);
    }

    const actions = document.createElement("div");
    actions.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEdit(movement.id));
    actions.appendChild(editBtn);

    li.appendChild(handle);
    li.appendChild(info);
    li.appendChild(actions);
    list.appendChild(li);
  }
}

Sortable.create(list, {
  handle: ".drag-handle",
  animation: 150,
  onEnd: (evt) => {
    if (evt.oldIndex === evt.newIndex) return;
    const data = loadData();
    const [moved] = data.movements.splice(evt.oldIndex, 1);
    data.movements.splice(evt.newIndex, 0, moved);
    saveData(data);
    render();
  },
});

function startEdit(id) {
  const data = loadData();
  const movement = data.movements.find((m) => m.id === id);
  if (!movement) return;
  editingId = id;
  idField.value = id;
  nameField.value = movement.name;
  notesField.value = movement.notes ?? "";
  currentDefaultSets = (movement.defaultSets ?? []).map((s) => ({
    id: uid(),
    weight: s.weight,
    reps: s.reps,
  }));
  renderDefaultSets();
  submitBtn.textContent = "Save changes";
  cancelBtn.classList.remove("hidden");
  deleteState = "idle";
  renderDeleteSection();
  nameField.focus();
}

function resetForm() {
  editingId = null;
  form.reset();
  idField.value = "";
  currentDefaultSets = [];
  renderDefaultSets();
  submitBtn.textContent = "Add movement";
  cancelBtn.classList.add("hidden");
  deleteState = "idle";
  renderDeleteSection();
}

function countWorkoutsUsingMovement(data, movementId) {
  return data.workouts.filter((w) =>
    w.rounds.some((round) => round.entries.some((entry) => entry.movementId === movementId))
  ).length;
}

function renderDeleteSection() {
  deleteSection.innerHTML = "";

  if (!editingId) {
    deleteSection.classList.add("hidden");
    return;
  }
  deleteSection.classList.remove("hidden");

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
    confirmBtn.textContent = "Delete movement";
    confirmBtn.addEventListener("click", confirmDeleteMovement);
    row.appendChild(cancelDeleteBtn);
    row.appendChild(confirmBtn);
    deleteSection.appendChild(row);
  } else if (deleteState === "blocked") {
    const warning = document.createElement("p");
    warning.className = "delete-warning";
    warning.textContent = `Can't delete — used in ${blockedCount} saved workout${
      blockedCount === 1 ? "" : "s"
    }. Remove it from ${blockedCount === 1 ? "that workout" : "those workouts"} first.`;
    deleteSection.appendChild(warning);

    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "secondary";
    okBtn.textContent = "OK";
    okBtn.addEventListener("click", () => {
      deleteState = "idle";
      renderDeleteSection();
    });
    deleteSection.appendChild(okBtn);
  } else {
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger";
    deleteBtn.textContent = "Delete movement";
    deleteBtn.addEventListener("click", startDelete);
    deleteSection.appendChild(deleteBtn);
  }
}

function startDelete() {
  const data = loadData();
  const count = countWorkoutsUsingMovement(data, editingId);
  if (count > 0) {
    deleteState = "blocked";
    blockedCount = count;
  } else {
    deleteState = "confirm";
  }
  renderDeleteSection();
}

function renderDefaultSets() {
  defaultSetsList.innerHTML = "";
  currentDefaultSets.forEach((set, index) => {
    defaultSetsList.appendChild(renderDefaultSetRow(set, index));
  });
}

function renderDefaultSetRow(set, index) {
  const row = document.createElement("div");
  row.className = "set-row";

  const label = document.createElement("span");
  label.className = "set-label";
  label.textContent = `Set ${index + 1}`;
  row.appendChild(label);

  const weightInput = document.createElement("input");
  weightInput.type = "number";
  weightInput.inputMode = "decimal";
  weightInput.placeholder = "Weight";
  weightInput.value = set.weight;
  weightInput.addEventListener("input", () => {
    set.weight = weightInput.value;
  });

  const repsInput = document.createElement("input");
  repsInput.type = "number";
  repsInput.inputMode = "numeric";
  repsInput.placeholder = "Reps";
  repsInput.value = set.reps;
  repsInput.addEventListener("input", () => {
    set.reps = repsInput.value;
  });

  const removeBtn = document.createElement("button");
  removeBtn.className = "icon-btn";
  removeBtn.type = "button";
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", () => {
    currentDefaultSets = currentDefaultSets.filter((s) => s.id !== set.id);
    renderDefaultSets();
  });

  row.appendChild(weightInput);
  row.appendChild(repsInput);
  row.appendChild(removeBtn);
  return row;
}

addDefaultSetBtn.addEventListener("click", () => {
  const last = currentDefaultSets[currentDefaultSets.length - 1];
  currentDefaultSets.push({ id: uid(), weight: last?.weight ?? "", reps: last?.reps ?? "" });
  renderDefaultSets();
});

function confirmDeleteMovement() {
  const data = loadData();
  data.movements = data.movements.filter((m) => m.id !== editingId);
  saveData(data);
  resetForm();
  render();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = nameField.value.trim();
  if (!name) return;
  const notes = notesField.value.trim();

  const data = loadData();
  if (editingId) {
    const movement = data.movements.find((m) => m.id === editingId);
    if (movement) {
      movement.name = name;
      movement.notes = notes;
      movement.defaultSets = currentDefaultSets;
    }
  } else {
    data.movements.push({ id: uid(), name, notes, defaultSets: currentDefaultSets });
  }
  saveData(data);
  resetForm();
  render();
});

cancelBtn.addEventListener("click", resetForm);

export function refresh() {
  resetForm();
  render();
}

render();
