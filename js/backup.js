import { loadData, saveData } from "./storage.js";
import { refresh as refreshWorkoutBuilder } from "./workout-builder.js";
import { refresh as refreshHistory } from "./history.js";
import { refresh as refreshLibrary } from "./library.js";

const backupBtn = document.getElementById("backup-btn");
const restoreBtn = document.getElementById("restore-btn");
const fileInput = document.getElementById("restore-file-input");
const panel = document.getElementById("restore-panel");

let restoreState = "idle"; // "idle" | "confirm" | "error" | "success"
let pendingImport = null;
let errorMessage = "";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function downloadBackup() {
  const data = loadData();
  const payload = {
    app: "strength-tracker-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    movements: data.movements,
    workouts: data.workouts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workout-tracker-backup-${todayStamp()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function validateBackup(json) {
  if (!isPlainObject(json)) {
    return { valid: false, reason: "This file doesn't contain a JSON object." };
  }
  if (!Array.isArray(json.movements)) {
    return {
      valid: false,
      reason: 'Missing or invalid "movements" list — this may not be a backup from this app.',
    };
  }
  if (!Array.isArray(json.workouts)) {
    return {
      valid: false,
      reason: 'Missing or invalid "workouts" list — this may not be a backup from this app.',
    };
  }

  for (const m of json.movements) {
    if (!isPlainObject(m) || typeof m.id !== "string" || typeof m.name !== "string") {
      return { valid: false, reason: "One or more movements are missing an id or name." };
    }
    if (m.defaultSets !== undefined && !Array.isArray(m.defaultSets)) {
      return { valid: false, reason: "A movement's default sets are malformed." };
    }
  }

  for (const w of json.workouts) {
    if (
      !isPlainObject(w) ||
      typeof w.id !== "string" ||
      typeof w.name !== "string" ||
      typeof w.date !== "string"
    ) {
      return { valid: false, reason: "One or more workouts are missing an id, name, or date." };
    }
    if (!Array.isArray(w.rounds)) {
      return { valid: false, reason: "A workout is missing its rounds." };
    }
    for (const r of w.rounds) {
      if (!isPlainObject(r) || typeof r.id !== "string" || !Array.isArray(r.entries)) {
        return { valid: false, reason: "A round is malformed." };
      }
      for (const e of r.entries) {
        if (
          !isPlainObject(e) ||
          typeof e.id !== "string" ||
          typeof e.movementId !== "string" ||
          !Array.isArray(e.sets)
        ) {
          return { valid: false, reason: "A movement entry is malformed." };
        }
        for (const s of e.sets) {
          if (!isPlainObject(s) || typeof s.id !== "string" || !("weight" in s) || !("reps" in s)) {
            return { valid: false, reason: "A set is malformed." };
          }
        }
      }
    }
  }

  return { valid: true };
}

function renderPanel() {
  panel.innerHTML = "";

  if (restoreState === "confirm" && pendingImport) {
    const current = loadData();
    const warning = document.createElement("p");
    warning.className = "delete-warning";
    warning.textContent =
      `This will replace your current data (${current.movements.length} movements, ` +
      `${current.workouts.length} workouts) with the backup (${pendingImport.movements.length} movements, ` +
      `${pendingImport.workouts.length} workouts). This can't be undone.`;
    panel.appendChild(warning);

    const row = document.createElement("div");
    row.className = "field-row";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      restoreState = "idle";
      pendingImport = null;
      renderPanel();
    });
    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "danger";
    confirmBtn.textContent = "Replace my data";
    confirmBtn.addEventListener("click", applyRestore);
    row.appendChild(cancelBtn);
    row.appendChild(confirmBtn);
    panel.appendChild(row);
  } else if (restoreState === "error") {
    const warning = document.createElement("p");
    warning.className = "delete-warning";
    warning.textContent = errorMessage;
    panel.appendChild(warning);

    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "secondary";
    okBtn.textContent = "OK";
    okBtn.addEventListener("click", () => {
      restoreState = "idle";
      renderPanel();
    });
    panel.appendChild(okBtn);
  } else if (restoreState === "success") {
    const msg = document.createElement("p");
    msg.className = "save-msg";
    msg.textContent = "Restore complete.";
    panel.appendChild(msg);
  }
}

function applyRestore() {
  if (!pendingImport) return;
  saveData({ movements: pendingImport.movements, workouts: pendingImport.workouts });
  pendingImport = null;
  restoreState = "success";
  renderPanel();
  refreshLibrary();
  refreshWorkoutBuilder();
  refreshHistory();
}

backupBtn.addEventListener("click", downloadBackup);

restoreBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  fileInput.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    let json;
    try {
      json = JSON.parse(reader.result);
    } catch {
      errorMessage = "This file isn't valid JSON — it doesn't look like a backup file.";
      restoreState = "error";
      renderPanel();
      return;
    }

    const result = validateBackup(json);
    if (!result.valid) {
      errorMessage = `${result.reason} Nothing was changed.`;
      restoreState = "error";
      renderPanel();
      return;
    }

    pendingImport = { movements: json.movements, workouts: json.workouts };
    restoreState = "confirm";
    renderPanel();
  };
  reader.onerror = () => {
    errorMessage = "Couldn't read that file. Nothing was changed.";
    restoreState = "error";
    renderPanel();
  };
  reader.readAsText(file);
});
