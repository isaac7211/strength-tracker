const UNITS = ["", "lb", "kg"];

// Free-text weight (so "Medium" or "10-20" works for bands) plus a unit dropdown.
export function createWeightField(set) {
  const wrapper = document.createElement("div");
  wrapper.className = "weight-field";

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "text";
  input.placeholder = "Weight";
  input.autocomplete = "off";
  input.value = set.weight ?? "";
  input.addEventListener("input", () => {
    set.weight = input.value;
  });

  const select = document.createElement("select");
  select.setAttribute("aria-label", "Weight unit");
  for (const unit of UNITS) {
    const opt = document.createElement("option");
    opt.value = unit;
    opt.textContent = unit || "—";
    select.appendChild(opt);
  }
  select.value = UNITS.includes(set.unit) ? set.unit : "";
  select.addEventListener("change", () => {
    set.unit = select.value;
  });

  wrapper.appendChild(input);
  wrapper.appendChild(select);
  return wrapper;
}
