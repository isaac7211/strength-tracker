import { loadData, saveData, uid } from "./storage.js";

let editingId = null;
let pendingDeleteId = null;

const form = document.getElementById("movement-form");
const idField = document.getElementById("movement-id");
const nameField = document.getElementById("movement-name");
const notesField = document.getElementById("movement-notes");
const submitBtn = document.getElementById("movement-submit-btn");
const cancelBtn = document.getElementById("movement-cancel-btn");
const list = document.getElementById("movement-list");
const emptyState = document.getElementById("movement-empty");

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
  submitBtn.textContent = "Save changes";
  cancelBtn.classList.remove("hidden");
  nameField.focus();
}

function resetForm() {
  editingId = null;
  form.reset();
  idField.value = "";
  submitBtn.textContent = "Add movement";
  cancelBtn.classList.add("hidden");
}

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
    }
  } else {
    data.movements.push({ id: uid(), name, notes });
  }
  saveData(data);
  resetForm();
  render();
});

cancelBtn.addEventListener("click", resetForm);

render();
