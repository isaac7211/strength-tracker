import { loadData, saveData, uid } from "./storage.js";

let editingId = null;
let pendingDeleteId = null;
let currentDefaultSets = [];

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

    if (pendingDeleteId === movement.id) {
      const confirmBtn = document.createElement("button");
      confirmBtn.className = "danger";
      confirmBtn.textContent = "Confirm delete";
      confirmBtn.addEventListener("click", () => deleteMovement(movement.id));
      const cancelDeleteBtn = document.createElement("button");
      cancelDeleteBtn.className = "icon-btn";
      cancelDeleteBtn.textContent = "Cancel";
      cancelDeleteBtn.addEventListener("click", () => {
        pendingDeleteId = null;
        render();
      });
      actions.appendChild(cancelDeleteBtn);
      actions.appendChild(confirmBtn);
    } else {
      const editBtn = document.createElement("button");
      editBtn.className = "icon-btn";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => startEdit(movement.id));
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "danger";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        pendingDeleteId = movement.id;
        render();
      });
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
    }

    li.appendChild(info);
    li.appendChild(actions);
    list.appendChild(li);
  }
}

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

function deleteMovement(id) {
  const data = loadData();
  data.movements = data.movements.filter((m) => m.id !== id);
  saveData(data);
  pendingDeleteId = null;
  if (editingId === id) resetForm();
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

render();
