import assert from "node:assert/strict";

import { assignmentKey, buildBranchManagerEmailIndex, normalizeEmail } from "../scripts/lib/directory-email-identity.mjs";

const index = buildBranchManagerEmailIndex([
  { sucursal: "Sta Ana - Santa Ana 2 - L013", "Gerente de sucursal": "LOPEZ DURAN, CARLOS FELIPE", correo: "felipe.duran@labanaliza.com" },
  { sucursal: "Sta Ana - Santa Ana 2 Fisioterapia", "Gerente de sucursal": "LOPEZ DURAN, CARLOS FELIPE", correo: "andrea.rivera@labanaliza.com" },
  { sucursal: "SS-Soma Fisioterapia", "Gerente de sucursal": "VASQUEZ HENRIQUEZ, GABRIELA AMANDA", correo: "PENDIENTE" },
  { sucursal: "SS - Santa Elena - L005", "Gerente de sucursal": "LEONOR", correo: "vleonor@labanaliza.com" },
  { sucursal: "SS - Santa Elena Fisioterapia", "Gerente de sucursal": "LEONOR", correo: "VLEONOR@labanaliza.com" },
]);

assert.equal(normalizeEmail(" PENDIENTE "), null);
assert.equal(index.emails.get(assignmentKey("Sta Ana - Santa Ana 2 - L013", "LOPEZ DURAN, CARLOS FELIPE")), "felipe.duran@labanaliza.com");
assert.equal(index.emails.get(assignmentKey("Sta Ana - Santa Ana 2 Fisioterapia", "LOPEZ DURAN, CARLOS FELIPE")), "andrea.rivera@labanaliza.com");
assert.equal(index.emails.get(assignmentKey("SS-Soma Fisioterapia", "VASQUEZ HENRIQUEZ, GABRIELA AMANDA")), undefined);
assert.equal(index.emails.get(assignmentKey("SS - Santa Elena - L005", "LEONOR")), "vleonor@labanaliza.com");
assert.equal(index.emails.get(assignmentKey("SS - Santa Elena Fisioterapia", "LEONOR")), "vleonor@labanaliza.com");
console.log("directory-email-identity: PASS");
