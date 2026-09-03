import assert from "node:assert/strict";
import { statSync, readFileSync } from "node:fs";

import {
  getDataConnector,
  listConnectorRuns,
  parseAuthorizedPhysioHtmlFixture,
  resetConnectorRuntimeForTests,
} from "../lib/data-ingestion/connectors.ts";
import {
  buildImportScope,
  getImportLineage,
  getIngestionStoreSnapshot,
  ingestTabularFile,
  listPublishedRows,
  publishImport,
  resetIngestionPlatformForTests,
  rollbackImport,
  sanitizeImportFileName,
} from "../lib/data-ingestion/platform.ts";
import {
  buildTemplateCsv,
  getIngestionTemplate,
  ingestionTemplates,
} from "../lib/data-ingestion/templates.ts";

const organizationId = "10000000-0000-4000-8000-000000000001";
const countryId = "30000000-0000-4000-8000-000000000003";
const labCompanyId = "40000000-0000-4000-8000-000000000002";
const labBranchId = "sv-aguilares-l033";
const labBranchName = "SS - Aguilares - L033";

function actor(roleKey, scope = {}) {
  return {
    allowDemoRoleSwitch: false,
    email: `${roleKey}@analiza.local`,
    roleKey,
    scope: {
      organizationId,
      ...scope,
    },
    source: "local",
    userId: `${roleKey}-user`,
  };
}

function validLabCsv(orderId = "ORD-1001") {
  return [
    "country,company,business_line,branch,branch_code,manager,period,order_id,test_code,volume,revenue,direct_cost,received_at,status,currency",
    `El Salvador,Analiza Laboratorio,Laboratorio,${labBranchName},L033,Gerente DEMO,2026-07,${orderId},HEMOGRAMA,1,18.50,7.25,2026-07-15,procesada,USD`,
  ].join("\n");
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function zipStored(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [name, content] of entries) {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.from(content);
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt32LE(0, 10);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt32LE(0, 12);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt32LE(0, 34);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localDirectory = Buffer.concat(localParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localDirectory.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([localDirectory, centralDirectory, end]);
}

function minimalXlsx() {
  const sharedStrings = [
    "country",
    "company",
    "business_line",
    "branch",
    "branch_code",
    "manager",
    "period",
    "order_id",
    "test_code",
    "volume",
    "revenue",
    "direct_cost",
    "received_at",
    "status",
    "currency",
    "El Salvador",
    "Analiza Laboratorio",
    "Laboratorio",
    labBranchName,
    "L033",
    "Gerente DEMO",
    "2026-07",
    "ORD-XLSX-1",
    "HEMOGRAMA",
    "1",
    "18.50",
    "7.25",
    "2026-07-15",
    "procesada",
    "USD",
  ];
  const cells = sharedStrings
    .map((_, index) => {
      const column = String.fromCharCode(65 + (index % 15));
      const row = index < 15 ? 1 : 2;
      return `<c r="${column}${row}" t="s"><v>${index}</v></c>`;
    })
    .reduce(
      (rows, cell, index) => {
        rows[index < 15 ? 0 : 1].push(cell);
        return rows;
      },
      [[], []],
    );
  const sheet = `<worksheet><sheetData><row r="1">${cells[0].join("")}</row><row r="2">${cells[1].join("")}</row></sheetData></worksheet>`;
  const strings = `<sst>${sharedStrings.map((value) => `<si><t>${value}</t></si>`).join("")}</sst>`;

  return zipStored([
    ["[Content_Types].xml", "<Types></Types>"],
    ["xl/workbook.xml", "<workbook></workbook>"],
    ["xl/sharedStrings.xml", strings],
    ["xl/worksheets/sheet1.xml", sheet],
  ]);
}

for (const file of [
  "lib/data-ingestion/templates.ts",
  "lib/data-ingestion/file-parser.ts",
  "lib/data-ingestion/platform.ts",
  "lib/data-ingestion/connectors.ts",
  "app/api/imports/upload/route.ts",
  "app/api/imports/templates/route.ts",
  "app/api/imports/[importId]/publish/route.ts",
  "app/api/imports/[importId]/rollback/route.ts",
  "app/api/imports/[importId]/lineage/route.ts",
  "app/api/connectors/status/route.ts",
  "app/api/connectors/[connectorId]/test/route.ts",
  "app/api/connectors/[connectorId]/sync/route.ts",
  "supabase/migrations/20260807000200_sprint3_ingestion_connectors.sql",
]) {
  statSync(file);
}

assert.ok(ingestionTemplates.length >= 13);
for (const datasetType of [
  "physiotherapy",
  "laboratory",
  "imaging",
  "billing",
  "payments",
  "direct_costs",
  "capacity",
  "appointments",
  "targets",
  "professionals",
  "services",
  "managers",
  "branches",
]) {
  const template = getIngestionTemplate(datasetType);
  assert.ok(template, `${datasetType} template missing`);
  assert.ok(template.fields.every((field) => field.definition && field.example));
}

const superAdmin = actor("super_admin");
const branchManager = actor("gerente_sucursal", {
  branchId: labBranchId,
  companyId: labCompanyId,
  countryId,
});
const scope = buildImportScope({
  branchId: labBranchId,
  branchName: labBranchName,
  companyId: labCompanyId,
  companyName: "Analiza Laboratorio",
  countryId,
  countryName: "El Salvador",
  organizationId,
});

resetIngestionPlatformForTests();
resetConnectorRuntimeForTests();

const csvResult = ingestTabularFile({
  actor: superAdmin,
  buffer: Buffer.from(validLabCsv(), "utf8"),
  contentType: "text/csv",
  datasetType: "laboratory",
  fileName: "../Laboratorio Julio.csv",
  period: "2026-07",
  scope,
  sourceId: "manual-file",
});

assert.equal(csvResult.importRecord.status, "VALIDATED");
assert.equal(csvResult.raw.immutable, true);
assert.equal(csvResult.stagingRows.length, 1);
assert.equal(sanitizeImportFileName("../Laboratorio Julio.csv"), "Laboratorio-Julio.csv");

const published = publishImport(csvResult.importRecord.id, superAdmin);
assert.equal(published.importRecord.status, "PUBLISHED");
assert.equal(listPublishedRows("laboratory").length, 1);

const lineage = getImportLineage(csvResult.importRecord.id);
assert.ok(lineage);
assert.equal(lineage.raw?.checksum, csvResult.raw.checksum);
assert.equal(lineage.audit.some((event) => event.action === "publish"), true);

const duplicate = ingestTabularFile({
  actor: superAdmin,
  buffer: Buffer.from(validLabCsv(), "utf8"),
  contentType: "text/csv",
  datasetType: "laboratory",
  fileName: "Laboratorio Julio.csv",
  period: "2026-07",
  scope,
  sourceId: "manual-file",
});
assert.equal(duplicate.importRecord.status, "BLOCKED");
assert.equal(duplicate.importRecord.duplicateOf, csvResult.importRecord.id);

const rolledBack = rollbackImport(
  csvResult.importRecord.id,
  superAdmin,
  "Prueba de rollback Sprint 3",
);
assert.equal(rolledBack.importRecord.status, "ROLLED_BACK");
assert.equal(listPublishedRows("laboratory").length, 0);

const xlsxResult = ingestTabularFile({
  actor: superAdmin,
  buffer: minimalXlsx(),
  contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  datasetType: "laboratory",
  fileName: "laboratorio.xlsx",
  period: "2026-07",
  scope,
  sourceId: "xlsx-upload",
});
assert.equal(xlsxResult.importRecord.status, "VALIDATED");
assert.equal(xlsxResult.stagingRows[0].mapped.order_id, "ORD-XLSX-1");

const xlsText = validLabCsv("ORD-XLS-1").replaceAll(",", "\t");
const xlsResult = ingestTabularFile({
  actor: superAdmin,
  buffer: Buffer.from(xlsText, "utf8"),
  contentType: "application/vnd.ms-excel",
  datasetType: "laboratory",
  fileName: "laboratorio.xls",
  period: "2026-07",
  scope,
  sourceId: "xls-upload",
});
assert.equal(xlsResult.importRecord.status, "VALIDATED");

const invalid = ingestTabularFile({
  actor: superAdmin,
  buffer: Buffer.from("country,company\nEl Salvador,Analiza Laboratorio\n", "utf8"),
  contentType: "text/csv",
  datasetType: "laboratory",
  fileName: "invalid.csv",
  period: "2026-07",
  scope,
  sourceId: "invalid-upload",
});
assert.equal(invalid.importRecord.status, "BLOCKED");
assert.equal(
  invalid.issues.some((issue) => issue.code === "required_column_missing"),
  true,
);

assert.throws(() =>
  ingestTabularFile({
    actor: superAdmin,
    buffer: Buffer.from("0123456789", "utf8"),
    contentType: "text/csv",
    datasetType: "laboratory",
    fileName: "large.csv",
    maxFileSizeBytes: 4,
    period: "2026-07",
    scope,
    sourceId: "large-upload",
  }),
);

const otherBranchCsv = validLabCsv("ORD-BRANCH-SCOPE").replace(
  labBranchName,
  "SS - Escalon - L001",
);
assert.throws(() => ingestTabularFile({
  actor: branchManager,
  buffer: Buffer.from(otherBranchCsv, "utf8"),
  contentType: "text/csv",
  datasetType: "laboratory",
  fileName: "otra-sucursal.csv",
  period: "2026-07",
  scope,
  sourceId: "branch-scope",
}), /no autorizado/);

const billingConnector = getDataConnector("billing-demo-adapter");
assert.ok(billingConnector);
const syncResult = await billingConnector.sync({
  actor: superAdmin,
  period: "2026-07",
  publish: true,
  scope,
});
assert.equal(syncResult.status, "success");
assert.ok(syncResult.importId);

const lisConnector = getDataConnector("laboratory-lis-api");
assert.ok(lisConnector);
const lisTest = await lisConnector.testConnection();
assert.equal(lisTest.ok, false);
assert.equal(lisTest.status, "Sin configurar");
const lisSync = await lisConnector.sync({
  actor: superAdmin,
  period: "2026-07",
  scope,
});
assert.equal(lisSync.status, "pending_credentials");
assert.equal(listConnectorRuns().some((run) => run.status === "pending_credentials"), true);

const scrapedRows = parseAuthorizedPhysioHtmlFixture(`
  <table>
    <tr data-appointment><td>APT-1</td><td>SS - Centro Medico - L024</td><td>Edwin Isaac Santillana</td><td>anon_1</td><td>atendida</td><td>Terapeuta</td><td>45</td><td>45</td><td>2026-07-15</td></tr>
  </table>
`);
assert.equal(scrapedRows.length, 1);
assert.throws(() => parseAuthorizedPhysioHtmlFixture("<form>captcha password</form>"));

const snapshot = getIngestionStoreSnapshot();
assert.ok(snapshot.auditCount >= 8);
assert.ok(snapshot.rawCount >= 4);
assert.ok(buildTemplateCsv(getIngestionTemplate("billing")).includes("net_billing"));

for (const routeFile of [
  "app/api/imports/upload/route.ts",
  "app/api/connectors/[connectorId]/sync/route.ts",
]) {
  const source = readFileSync(routeFile, "utf8");
  assert.ok(source.includes("requireProtectedAccess"));
}

const connectorSyncRoute = readFileSync(
  "app/api/connectors/[connectorId]/sync/route.ts",
  "utf8",
);
assert.ok(
  connectorSyncRoute.includes("connectors.run"),
  "Connector sync route must enforce connector run authorization.",
);

const lineageRoute = readFileSync("app/api/imports/[importId]/lineage/route.ts", "utf8");
assert.ok(
  lineageRoute.includes("route.access") && lineageRoute.includes("record.read"),
  "Import lineage route must enforce route and record-scope authorization.",
);

const migration = readFileSync(
  "supabase/migrations/20260807000200_sprint3_ingestion_connectors.sql",
  "utf8",
);
for (const requiredSql of [
  "ingestion_raw_files",
  "ingestion_staging_rows",
  "ingestion_published_rows",
  "ingestion_lineage",
  "ingestion_audit_events",
  "ingestion_connector_runs",
  "current_user_can_access_branch",
]) {
  assert.ok(migration.includes(requiredSql));
}

console.log("Macro Sprint 3 ingestion and connector checks passed.");
