function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normal(value) {
  return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function normalizeEmail(value) {
  const email = text(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function field(row, names) {
  for (const name of names) {
    if (Object.hasOwn(row, name) && text(row[name])) return text(row[name]);
  }
  return "";
}

export function assignmentKey(branch, managerName) {
  return `${normal(branch)}|${normal(managerName)}`;
}

/** A workbook email is authoritative only for its own branch assignment. */
export function buildBranchManagerEmailIndex(rows) {
  const emails = new Map();
  const ambiguous = new Set();
  for (const row of rows) {
    const branch = field(row, ["sucursal", "Sucursal", "nombre sucursal", "Nombre sucursal"]);
    const managerName = field(row, ["Gerente de sucursal", "gerente de sucursal", "Gerente", "gerente"]);
    const email = normalizeEmail(field(row, ["correo", "Correo", "email", "Email"]));
    if (!branch || !managerName || !email) continue;
    const key = assignmentKey(branch, managerName);
    const prior = emails.get(key);
    if (prior && prior !== email) {
      emails.delete(key);
      ambiguous.add(key);
    } else if (!ambiguous.has(key)) {
      emails.set(key, email);
    }
  }
  return { ambiguous, emails };
}
