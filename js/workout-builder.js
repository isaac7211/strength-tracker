import { loadData, saveData, uid } from "./storage.js";
import { createWeightField } from "./weight-field.js";

const nameField = document.getElementById("workout-name");
const datetimeField = document.getElementById("workout-datetime");
const roundsContainer = document.getElementById("rounds-container");
const noMovementsHint = document.getElementById("no-movements-hint");
const addRoundBtn = document.getElementById("add-round-btn");
const saveBtn = document.getElementById("save-workout-btn");

let draft = null;

function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function newSet() {
  return { id: uid(), weight: "", unit: "", seconds: "", reps: "" };
}

function cloneSet(set) {
  return {
    id: uid(),
    weight: set.weight,
    unit: set.unit ?? "",
    seconds: set.seconds ?? "",
    reps: set.reps,
  };
}

function newEntry(movementId) {
  const data = loadData();
  const movement = data.movements.find((m) => m.id === movementId);
  const defaults = movement?.defaultSets;
  const sets = defaults && defaults.length > 0 ? defaults.map(cloneSet) : [newSet()];
  return { id: uid(), movementId, checked: false, sets };
}

function newRound(previousRound) {
  if (!previousRound) return { id: uid(), entries: [] };
  return {
    id: uid(),
    entries: previousRound.entries.map((entry) => ({
      id: uid(),
      movementId: entry.movementId,
      checked: false,
      sets: entry.sets.map(cloneSet),
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
        checked: false,
        sets: entry.sets.map(cloneSet),
      })),
    })),
  };
  nameField.value = draft.name;
  datetimeField.value = draft.date;
  render();
}

function getMovement(movementId) {
  const data = loadData();
  return data.movements.find((m) => m.id === movementId) ?? null;
}

function movementName(movementId) {
  const movement = getMovement(movementId);
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

  const allChecked = round.entries.length > 0 && round.entries.every((e) => e.checked);
  card.classList.toggle("complete", allChecked);

  const header = document.createElement("div");
  header.className = "round-header";
  const h3 = document.createElement("h3");
  h3.textContent = `Round ${roundIndex + 1}`;
  header.appendChild(h3);

  const actions = document.createElement("div");
  actions.className = "round-actions";

  if (round.entries.length > 0) {
    const checkAllBtn = document.createElement("button");
    checkAllBtn.className = "icon-btn";
    checkAllBtn.type = "button";
    checkAllBtn.textContent = allChecked ? "Uncheck all" : "Check all";
    checkAllBtn.addEventListener("click", () => {
      round.entries.forEach((e) => {
        e.checked = !allChecked;
      });
      render();
    });
    actions.appendChild(checkAllBtn);
  }

  if (draft.rounds.length > 1) {
    const removeBtn = document.createElement("button");
    removeBtn.className = "icon-btn";
    removeBtn.textContent = "Remove round";
    removeBtn.addEventListener("click", () => {
      draft.rounds = draft.rounds.filter((r) => r.id !== round.id);
      render();
    });
    actions.appendChild(removeBtn);
  }
  header.appendChild(actions);
  card.appendChild(header);

  const entryList = document.createElement("ul");
  entryList.className = "entry-list";
  round.entries.forEach((entry) => {
    entryList.appendChild(renderEntry(round, entry));
  });
  card.appendChild(entryList);

  Sortable.create(entryList, {
    handle: ".drag-handle",
    animation: 150,
    onEnd: (evt) => {
      if (evt.oldIndex === evt.newIndex) return;
      const [moved] = round.entries.splice(evt.oldIndex, 1);
      round.entries.splice(evt.newIndex, 0, moved);
      render();
    },
  });

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
  li.classList.toggle("checked", !!entry.checked);

  const header = document.createElement("div");
  header.className = "entry-header";
  const handle = document.createElement("span");
  handle.className = "drag-handle";
  handle.textContent = "⠷";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "entry-checkbox";
  checkbox.checked = !!entry.checked;
  checkbox.setAttribute("aria-label", "Mark movement complete");
  checkbox.addEventListener("change", () => {
    entry.checked = checkbox.checked;
    render();
  });

  const name = document.createElement("span");
  name.className = "entry-name";
  name.textContent = movementName(entry.movementId);

  header.appendChild(handle);
  header.appendChild(checkbox);
  header.appendChild(name);

  if (!entry.checked) {
    const addSetBtn = document.createElement("button");
    addSetBtn.className = "icon-btn";
    addSetBtn.type = "button";
    addSetBtn.textContent = "+ Add set";
    addSetBtn.addEventListener("click", () => {
      const last = entry.sets[entry.sets.length - 1];
      entry.sets.push(cloneSet(last ?? newSet()));
      render();
    });
    header.appendChild(addSetBtn);

    const removeBtn = document.createElement("button");
    removeBtn.className = "icon-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      round.entries = round.entries.filter((e) => e.id !== entry.id);
      render();
    });
    header.appendChild(removeBtn);
  }

  li.appendChild(header);

  if (!entry.checked) {
    const movement = getMovement(entry.movementId);
    if (movement?.notes) {
      const notes = document.createElement("p");
      notes.className = "entry-notes";
      notes.textContent = movement.notes;
      li.appendChild(notes);
    }

    const setsList = document.createElement("div");
    setsList.className = "sets-list";
    entry.sets.forEach((set, setIndex) => {
      setsList.appendChild(renderSetRow(entry, set, setIndex));
    });
    li.appendChild(setsList);
  }

  return li;
}

function renderSetRow(entry, set, setIndex) {
  const row = document.createElement("div");
  row.className = "set-row";

  const label = document.createElement("span");
  label.className = "set-label";
  label.textContent = `Set ${setIndex + 1}`;
  row.appendChild(label);

  const weightField = createWeightField(set);

  const secondsInput = document.createElement("input");
  secondsInput.type = "number";
  secondsInput.inputMode = "numeric";
  secondsInput.placeholder = "Sec";
  secondsInput.setAttribute("aria-label", "Seconds");
  secondsInput.value = set.seconds ?? "";
  secondsInput.addEventListener("input", () => {
    set.seconds = secondsInput.value;
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

  row.appendChild(weightField);
  row.appendChild(secondsInput);
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

  const toSave = structuredClone(draft);
  toSave.rounds.forEach((r) => r.entries.forEach((e) => delete e.checked));

  const data = loadData();
  data.workouts.push(toSave);
  saveData(data);

  startBlankDraft();
  document.dispatchEvent(new CustomEvent("workout:saved", { detail: { id: toSave.id } }));
});

startBlankDraft();
