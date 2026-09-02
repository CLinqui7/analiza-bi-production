import { inflateRawSync } from "node:zlib";

export type ParsedTabularFile = {
  fileKind: "csv" | "xlsx" | "xls";
  headers: string[];
  rows: Record<string, string>[];
  warnings: string[];
};

export type FileDetectionResult = {
  extension: string;
  fileKind: ParsedTabularFile["fileKind"] | "unknown";
  mimeFamily: string;
};

type ZipEntry = {
  name: string;
  data: Buffer;
};

const xlsxSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const xlsBinarySignature = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);

function startsWith(buffer: Buffer, signature: Buffer) {
  return buffer.subarray(0, signature.length).equals(signature);
}

function stripBom(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function isMostlyPrintable(value: string) {
  if (!value) {
    return false;
  }

  const printableCount = [...value.slice(0, 4096)].filter((character) => {
    const code = character.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code < 127);
  }).length;

  return printableCount / Math.min(value.length, 4096) > 0.9;
}

function extensionOf(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);

  return match ? `.${match[1]}` : "";
}

export function detectTabularFile({
  buffer,
  contentType,
  fileName,
}: {
  buffer: Buffer;
  contentType?: string | null;
  fileName: string;
}): FileDetectionResult {
  const extension = extensionOf(fileName);
  const textHead = stripBom(buffer.subarray(0, 4096).toString("utf8"));
  const contentTypeValue = contentType?.toLowerCase().trim() ?? "";

  if (startsWith(buffer, xlsxSignature)) {
    return {
      extension,
      fileKind: "xlsx",
      mimeFamily: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  if (startsWith(buffer, xlsBinarySignature)) {
    return {
      extension,
      fileKind: "xls",
      mimeFamily: "application/vnd.ms-excel",
    };
  }

  if (
    extension === ".csv" ||
    contentTypeValue.includes("csv") ||
    (isMostlyPrintable(textHead) && textHead.includes(","))
  ) {
    return {
      extension,
      fileKind: "csv",
      mimeFamily: "text/csv",
    };
  }

  if (
    extension === ".xls" &&
    isMostlyPrintable(textHead) &&
    (textHead.includes("\t") || textHead.toLowerCase().includes("<table"))
  ) {
    return {
      extension,
      fileKind: "xls",
      mimeFamily: "application/vnd.ms-excel-text",
    };
  }

  return {
    extension,
    fileKind: "unknown",
    mimeFamily: contentTypeValue || "application/octet-stream",
  };
}

function parseDelimited(text: string, delimiter: "," | "\t") {
  const rows: string[][] = [];
  const value = normalizeLineEndings(stripBom(text));
  let current = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const nextCharacter = value[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && character === delimiter) {
      currentRow.push(current.trim());
      current = "";
      continue;
    }

    if (!inQuotes && character === "\n") {
      currentRow.push(current.trim());
      rows.push(currentRow);
      current = "";
      currentRow = [];
      continue;
    }

    current += character;
  }

  if (current.length > 0 || currentRow.length > 0) {
    currentRow.push(current.trim());
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.length > 0));
}

function tableFromRows(fileKind: ParsedTabularFile["fileKind"], rows: string[][]) {
  const [headersRow, ...dataRows] = rows;
  const headers = (headersRow ?? []).map((header, index) =>
    header.trim() || `column_${index + 1}`,
  );

  return {
    fileKind,
    headers,
    rows: dataRows.map((row) =>
      Object.fromEntries(
        headers.map((header, index) => [header, row[index]?.trim() ?? ""]),
      ),
    ),
    warnings: [],
  } satisfies ParsedTabularFile;
}

function parseHtmlTable(text: string) {
  const normalized = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ");
  const rows = [...normalized.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(
    (rowMatch) =>
      [...rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
        (cellMatch) => decodeXml(cellMatch[1].replace(/<[^>]+>/g, "").trim()),
      ),
  );

  return tableFromRows("xls", rows);
}

function readUInt32(buffer: Buffer, offset: number) {
  return buffer.readUInt32LE(offset);
}

function readUInt16(buffer: Buffer, offset: number) {
  return buffer.readUInt16LE(offset);
}

function readZipEntries(buffer: Buffer) {
  const entries: ZipEntry[] = [];
  let eocdOffset = -1;

  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (readUInt32(buffer, offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error("XLSX invalido: no se encontro directorio ZIP.");
  }

  const entryCount = readUInt16(buffer, eocdOffset + 10);
  const centralDirectoryOffset = readUInt32(buffer, eocdOffset + 16);
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(buffer, offset) !== 0x02014b50) {
      throw new Error("XLSX invalido: entrada ZIP corrupta.");
    }

    const compressionMethod = readUInt16(buffer, offset + 10);
    const compressedSize = readUInt32(buffer, offset + 20);
    const fileNameLength = readUInt16(buffer, offset + 28);
    const extraLength = readUInt16(buffer, offset + 30);
    const commentLength = readUInt16(buffer, offset + 32);
    const localHeaderOffset = readUInt32(buffer, offset + 42);
    const name = buffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8");
    const localFileNameLength = readUInt16(buffer, localHeaderOffset + 26);
    const localExtraLength = readUInt16(buffer, localHeaderOffset + 28);
    const dataStart =
      localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);
    const data =
      compressionMethod === 0
        ? compressedData
        : compressionMethod === 8
          ? inflateRawSync(compressedData)
          : null;

    if (data) {
      entries.push({ data, name });
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function decodeXml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function columnIndexFromCellRef(cellRef: string) {
  const letters = cellRef.replace(/[0-9]/g, "").toUpperCase();
  let index = 0;

  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }

  return Math.max(index - 1, 0);
}

function parseSharedStrings(xml: string) {
  return [...xml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map((match) => {
    const textParts = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(
      (textMatch) => decodeXml(textMatch[1]),
    );

    return textParts.join("");
  });
}

function parseSheetRows(sheetXml: string, sharedStrings: string[]) {
  return [...sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const rowValues: string[] = [];
    const cells = [...rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)];

    for (const cell of cells) {
      const attrs = cell[1];
      const body = cell[2];
      const ref = attrs.match(/\br="([^"]+)"/)?.[1] ?? "";
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "";
      const columnIndex = ref ? columnIndexFromCellRef(ref) : rowValues.length;
      const rawValue = body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? "";
      const inlineValue =
        body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? rawValue;
      const value =
        type === "s"
          ? sharedStrings[Number(rawValue)] ?? ""
          : decodeXml(inlineValue.trim());

      rowValues[columnIndex] = value;
    }

    return rowValues.map((value) => value ?? "");
  });
}

function parseXlsx(buffer: Buffer) {
  const entries = readZipEntries(buffer);
  const sharedStringsXml =
    entries.find((entry) => entry.name === "xl/sharedStrings.xml")?.data.toString(
      "utf8",
    ) ?? "";
  const sheetXml = entries
    .find((entry) => entry.name.startsWith("xl/worksheets/sheet"))
    ?.data.toString("utf8");

  if (!sheetXml) {
    throw new Error("XLSX invalido: no se encontro hoja de calculo.");
  }

  return tableFromRows("xlsx", parseSheetRows(sheetXml, parseSharedStrings(sharedStringsXml)));
}

export function parseTabularFile({
  buffer,
  contentType,
  fileName,
}: {
  buffer: Buffer;
  contentType?: string | null;
  fileName: string;
}): ParsedTabularFile {
  const detected = detectTabularFile({ buffer, contentType, fileName });

  if (detected.fileKind === "csv") {
    return tableFromRows("csv", parseDelimited(buffer.toString("utf8"), ","));
  }

  if (detected.fileKind === "xlsx") {
    return parseXlsx(buffer);
  }

  if (detected.fileKind === "xls") {
    if (startsWith(buffer, xlsBinarySignature)) {
      return {
        fileKind: "xls",
        headers: [],
        rows: [],
        warnings: [
          "Archivo XLS binario reconocido; convertir a CSV/XLSX para preview editable.",
        ],
      };
    }

    const text = buffer.toString("utf8");

    if (text.toLowerCase().includes("<table")) {
      return parseHtmlTable(text);
    }

    return tableFromRows("xls", parseDelimited(text, "\t"));
  }

  throw new Error(`Tipo de archivo no soportado: ${detected.mimeFamily}`);
}
