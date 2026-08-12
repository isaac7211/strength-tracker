const indicator = document.getElementById("wake-lock-indicator");
const supported = "wakeLock" in navigator;

let sentinel = null;
let desired = false;

function updateIndicator() {
  indicator.classList.toggle("hidden", !sentinel);
}

async function acquire() {
  if (!supported || !desired || sentinel) return;
  try {
    sentinel = await navigator.wakeLock.request("screen");
    sentinel.addEventListener("release", () => {
      sentinel = null;
      updateIndicator();
    });
  } catch {
    sentinel = null;
  }
  updateIndicator();
}

async function release() {
  const current = sentinel;
  sentinel = null;
  updateIndicator();
  if (current) {
    try {
      await current.release();
    } catch {
      // already released
    }
  }
}

export function enable() {
  desired = true;
  acquire();
}

export function disable() {
  desired = false;
  release();
}

if (supported) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && desired) {
      acquire();
    }
  });
}
