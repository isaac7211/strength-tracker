import { loadData, saveData, uid } from "./storage.js";

const nameField = document.getElementById("workout-name");
const datetimeField = document.getElementById("workout-datetime");
const roundsContainer = document.getElementById("rounds-container");
const noMovementsHint = document.getElementById("no-movements-hint");
const addRoundBtn = document.getElementById("add-round-btn");
const saveBtn = document.getElementById("save-workout-btn");
const saveMsg = document.getElementById("workout-save-msg");

let draft = null;

function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function newSet() {
  return { id: uid(), weight: "", reps: "" };
}

function newEntry(movementId) {
  return { id: uid(), movementId, sets: [newSet()] };
}

function newRound(previousRound) {
  if (!previousRound) return { id: uid(), entries: [] };
  return {
    id: uid(),
    entries: previousRound.entries.map((entry) => ({
      id: uid(),
      movementId: entry.movementId,
      sets: entry.sets.map((set) => ({ id: uid(), weight: set.weight, reps: set.reps })),
    })),
  };
}

export function startBlankDraft() {
  draft = {
    id: uid(),
    name: "",
    date: nowForInput(),
    rounds: [newRound()],
  };
  nameField.value = "";
  datetimeField.value = draft.date;
  saveMsg.classList.add("hidden");
  render();
}

// Start a new draft pre-filled from a past workout. Everything gets fresh
// ids so saving creates an independent record — the source workout (and its
// history entry) is never mutated.
export function loadAsTemplate(sourceWorkout) {
  draft = {
    id: uid(),
    name: sourceWorkout.name,
    date: nowForInput(),
    rounds: sourceWorkout.rounds.map((round) => ({
      id: uid(),
      entries: round.entries.map((entry) => ({
        id: uid(),
        movementId: entry.movementId,
        sets: entry.sets.map((set) => ({ id: uid(), weight: set.weight, reps: set.reps })),
      })),
    })),
  };
  nameField.value = draft.name;
  datetimeField.value = draft.date;
  saveMsg.classList.add("hidden");
  render();
}

function movementName(movementId) {
  const data = loadData();
  const movement = data.movements.find((m) => m.id === movementId);
  return movement ? movement.name : "(deleted movement)";
}

export function refresh() {
  if (draft) render();
}

function render() {
  const data = loadData();
  roundsContainer.innerHTML = "";

  if (data.movements.length === 0) {
    noMovementsHint.classList.remove("hidden");
  } else {
    noMovementsHint.classList.add("hidden");
  }

  draft.rounds.forEach((round, roundIndex) => {
    roundsContainer.appendChild(renderRound(round, roundIndex, data.movements));
  });
}

function renderRound(round, roundIndex, movements) {
  const card = document.createElement("div");
  card.className = "round-card";

  const header = document.createElement("div");
  header.className = "round-header";
  const h3 = document.createElement("h3");
  h3.textContent = `Round ${roundIndex + 1}`;
  header.appendChild(h3);

  if (draft.rounds.length > 1) {
    const removeBtn = document.createElement("button");
    removeBtn.className = "icon-btn";
    removeBtn.textContent = "Remove round";
    removeBtn.addEventListener("click", () => {
      draft.rounds = draft.rounds.filter((r) => r.id !== round.id);
      render();
    });
    header.appendChild(removeBtn);
  }
  card.appendChild(header);

  const entryList = document.createElement("ul");
  entryList.className = "entry-list";
  round.entries.forEach((entry) => {
    entryList.appendChild(renderEntry(round, entry));
  });
  card.appendChild(entryList);

  const addEntryRow = document.createElement("div");
  addEntryRow.className = "add-entry-row";
  const select = document.createElement("select");
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "+ Add movement...";
  select.appendChild(placeholder);
  for (const m of movements) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    select.appendChild(opt);
  }
  select.addEventListener("change", () => {
    if (!select.value) return;
    round.entries.push(newEntry(select.value));
    render();
  });
  addEntryRow.appendChild(select);
  card.appendChild(addEntryRow);

  return card;
}

function renderEntry(round, entry) {
  const li = document.createElement("li");
  li.className = "entry-item";
  li.dataset.entryId = entry.id;

  const header = document.createElement("div");
  header.className = "entry-header";
  const handle = document.createElement("span");
  handle.className = "drag-handle";
  handle.textContent = "⠷";
  attachDragHandlers(handle, li, round, entry);
  const name = document.createElement("span");
  name.className = "entry-name";
  name.textContent = movementName(entry.movementId);
  const removeBtn = document.createElement("button");
  removeBtn.className = "icon-btn";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => {
    round.entries = round.entries.filter((e) => e.id !== entry.id);
    render();
  });
  header.appendChild(handle);
  header.appendChild(name);
  header.appendChild(removeBtn);
  li.appendChild(header);

  const setsList = document.createElement("div");
  setsList.className = "sets-list";
  entry.sets.forEach((set, setIndex) => {
    setsList.appendChild(renderSetRow(entry, set, setIndex));
  });
  li.appendChild(setsList);

  const addSetBtn = document.createElement("button");
  addSetBtn.className = "icon-btn add-set-btn";
  addSetBtn.type = "button";
  addSetBtn.textContent = "+ Add set";
  addSetBtn.addEventListener("click", () => {
    const last = entry.sets[entry.sets.length - 1];
    entry.sets.push({ id: uid(), weight: last?.weight ?? "", reps: last?.reps ?? "" });
    render();
  });
  li.appendChild(addSetBtn);

  return li;
}

// Pointer Events (not native HTML5 drag-and-drop) so reordering works on
// touch devices, not just mouse.
function attachDragHandlers(handle, li, round, entry) {
  handle.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    li.classList.add("dragging");
    const ownList = li.closest(".entry-list");
    let dropTarget = null;

    const onMove = (moveEvent) => {
      moveEvent.preventDefault();
      const elAtPoint = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const candidate = elAtPoint ? elAtPoint.closest(".entry-item") : null;
      if (dropTarget && dropTarget !== candidate) {
        dropTarget.classList.remove("drag-over");
        dropTarget = null;
      }
      if (candidate && candidate !== li && candidate.closest(".entry-list") === ownList) {
        candidate.classList.add("drag-over");
        dropTarget = candidate;
      }
    };

    const onUp = () => {
      handle.releasePointerCapture(e.pointerId);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      li.classList.remove("dragging");
      if (dropTarget) {
        dropTarget.classList.remove("drag-over");
        const targetEntryId = dropTarget.dataset.entryId;
        const fromIndex = round.entries.findIndex((en) => en.id === entry.id);
        const toIndex = round.entries.findIndex((en) => en.id === targetEntryId);
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          const [moved] = round.entries.splice(fromIndex, 1);
          round.entries.splice(toIndex, 0, moved);
          render();
        }
      }
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  });
}

function renderSetRow(entry, set, setIndex) {
  const row = document.createElement("div");
  row.className = "set-row";

  const label = document.createElement("span");
  label.className = "set-label";
  label.textContent = `Set ${setIndex + 1}`;
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
  removeBtn.textContent = "×";
  removeBtn.type = "button";
  removeBtn.disabled = entry.sets.length <= 1;
  removeBtn.addEventListener("click", () => {
    if (entry.sets.length <= 1) return;
    entry.sets = entry.sets.filter((s) => s.id !== set.id);
    render();
  });

  row.appendChild(weightInput);
  row.appendChild(repsInput);
  row.appendChild(removeBtn);
  return row;
}

addRoundBtn.addEventListener("click", () => {
  const previousRound = draft.rounds[draft.rounds.length - 1];
  draft.rounds.push(newRound(previousRound));
  render();
});

nameField.addEventListener("input", () => {
  draft.name = nameField.value;
});

datetimeField.addEventListener("input", () => {
  draft.date = datetimeField.value;
});

saveBtn.addEventListener("click", () => {
  draft.name = nameField.value.trim() || "Untitled Workout";
  draft.date = datetimeField.value || nowForInput();

  const data = loadData();
  data.workouts.push(structuredClone(draft));
  saveData(data);

  startBlankDraft();
  saveMsg.textContent = "Workout saved.";
  saveMsg.classList.remove("hidden");
});

startBlankDraft();
