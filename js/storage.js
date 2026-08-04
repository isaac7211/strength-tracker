const STORAGE_KEY = "strength-tracker-data-v1";

function emptyData() {
  return { movements: [], workouts: [] };
}

export function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData();
  try {
    const parsed = JSON.parse(raw);
    return {
      movements: parsed.movements ?? [],
      workouts: parsed.workouts ?? [],
    };
  } catch {
    return emptyData();
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}
