"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderDown,
  GitBranch,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildTemplatePackageFiles,
  buildTemplateWorkbookFile,
  getAllTemplatePackageSummaries,
  getTemplateLibraryTotals,
  getTemplateModeLabel,
  templateLineDescriptions,
} from "@/lib/analytics/template-downloads";
import {
  importBusinessLines,
  type BulkImportDocument,
  type ImportBusinessLine,
} from "@/lib/analytics/import-operations";
import { cn } from "@/lib/utils";

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";

type StoredContext = {
  countryName?: string;
  companyName?: string;
  businessLineId?: string;
  businessLineName?: string;
  branchName?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  isDemo?: boolean;
};

const lineToneClasses: Record<ImportBusinessLine, string> = {
  Consolidado: "border-slate-200 bg-slate-50 text-slate-800",
  Fisioterapia: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Imagenes: "border-sky-200 bg-sky-50 text-sky-800",
  Laboratorio: "border-indigo-200 bg-indigo-50 text-indigo-800",
};

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function readStoredContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawContext =
    window.localStorage.getItem(storageKey) ??
    window.sessionStorage.getItem(storageKey);

  if (!rawContext) {
    return null;
  }

  try {
    return JSON.parse(rawContext) as StoredContext;
  } catch {
    window.localStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

function resolveLineFromContext(context: StoredContext | null): ImportBusinessLine {
  const lineText = [
    context?.businessLineId,
    context?.businessLineName,
    context?.companyName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (lineText.includes("laboratorio")) {
    return "Laboratorio";
  }

  if (lineText.includes("fisioterapia")) {
    return "Fisioterapia";
  }

  if (lineText.includes("imagen")) {
    return "Imagenes";
  }

  return "Laboratorio";
}

function getQueryPeriodLabel() {
  if (typeof window === "undefined") {
    return null;
  }

  const from = new URLSearchParams(window.location.search).get("from");

  if (!from) {
    return null;
  }

  const date = new Date(`${from}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function getMonthLabelFromText(value: string) {
  const match = /(\d{4}-\d{2}-\d{2})/.exec(value);

  if (!match) {
    return null;
  }

  const date = new Date(`${match[1]}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function getPeriodLabel(context: StoredContext | null) {
  if (context?.period) {
    return getMonthLabelFromText(context.period) ?? context.period;
  }

  if (context?.periodStart) {
    return getMonthLabelFromText(context.periodStart) ?? context.periodStart;
  }

  return getQueryPeriodLabel() ?? "Julio 2026";
}

function downloadWorkbook(fileName: string, workbookXml: string) {
  const blob = new Blob([workbookXml], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MetricCard({
  icon: Icon,
  label,
  note,
  value,
}: {
  icon: typeof FileSpreadsheet;
  label: string;
  note: string;
  value: string;
}) {
  return (
    <article className="grid min-h-32 gap-3 rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="text-2xl font-semibold tracking-normal">{value}</p>
      <p className="text-xs leading-5 text-muted-foreground">{note}</p>
    </article>
  );
}

function ScopeCard({
  context,
  periodLabel,
  selectedLine,
}: {
  context: StoredContext | null;
  periodLabel: string;
  selectedLine: ImportBusinessLine;
}) {
  return (
    <aside className="rounded-md border bg-card p-4 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <CheckCircle2 className="size-4 text-primary" />
        Paquete activo
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <span>{context?.countryName ?? "Vista regional"}</span>
        <span>{context?.branchName ?? "Todas las sucursales"}</span>
        <span>Linea: {selectedLine}</span>
        <span>Periodo a llenar: {periodLabel}</span>
      </div>
    </aside>
  );
}

function LinePackageCard({
  active,
  line,
  onDownload,
  onSelect,
}: {
  active: boolean;
  line: ImportBusinessLine;
  onDownload: () => void;
  onSelect: () => void;
}) {
  const summary = getAllTemplatePackageSummaries().find(
    (item) => item.line === line,
  );

  if (!summary) {
    return null;
  }

  return (
    <article
      className={cn(
        "grid gap-4 rounded-md border bg-card p-4",
        active && "border-primary bg-primary/5",
      )}
    >
      <button className="grid gap-2 text-left" onClick={onSelect} type="button">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={lineToneClasses[line]}>{line}</Badge>
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            DEMO
          </Badge>
        </div>
        <h2 className="text-lg font-semibold tracking-normal">
          Paquete {line}
        </h2>
        <p className="text-xs leading-5 text-muted-foreground">
          {templateLineDescriptions[line]}
        </p>
      </button>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md bg-muted px-3 py-2">
          <div className="font-semibold">{summary.documents.length}</div>
          <div className="text-muted-foreground">Excel</div>
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <div className="font-semibold">{summary.requiredCount}</div>
          <div className="text-muted-foreground">Oblig.</div>
        </div>
        <div className="rounded-md bg-muted px-3 py-2">
          <div className="font-semibold">{summary.latestUploadedCount}</div>
          <div className="text-muted-foreground">Base</div>
        </div>
      </div>

      <Button onClick={onDownload} type="button">
        <FolderDown className="size-4" />
        Descargar paquete
      </Button>
    </article>
  );
}

function TemplateDocumentCard({
  document,
  onDownload,
}: {
  document: BulkImportDocument;
  onDownload: () => void;
}) {
  return (
    <article className="grid gap-4 rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className={lineToneClasses[document.businessLine]}>
              {document.businessLine}
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              DEMO
            </Badge>
            <Badge variant="outline">
              {document.required ? "Obligatoria" : "Opcional"}
            </Badge>
          </div>
          <h3 className="text-base font-semibold tracking-normal">
            {document.name}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {document.purpose}
          </p>
        </div>
        <FileSpreadsheet className="size-5 shrink-0 text-primary" />
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <span>
          <strong className="font-medium text-foreground">Modo:</strong>{" "}
          {getTemplateModeLabel(document)}
        </span>
        <span>
          <strong className="font-medium text-foreground">Frecuencia:</strong>{" "}
          {document.frequency}
        </span>
        <span>
          <strong className="font-medium text-foreground">Ultima subida:</strong>{" "}
          {document.lastUploadedAt ?? "Sin carga previa"}
        </span>
        <span>
          <strong className="font-medium text-foreground">PII:</strong>{" "}
          {document.piiRisk}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onDownload} type="button" variant="outline">
          <Download className="size-4" />
          Descargar Excel
        </Button>
        <Badge variant="outline">{document.sourceTemplate}</Badge>
      </div>
    </article>
  );
}

function UpdateFlow() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <article className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Archive className="size-4" />
          Ultima subida
        </div>
        <p className="text-xs leading-5">
          Cuando existe una carga anterior, el Excel incluye una hoja
          ULTIMA_SUBIDA_SIN_PII para usarla como base sin exponer pacientes.
        </p>
      </article>
      <article className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="size-4" />
          Siguiente mes
        </div>
        <p className="text-xs leading-5">
          La hoja CARGA_SIGUIENTE_MES trae el periodo activo y las columnas
          exactas que el gerente debe completar antes de importar.
        </p>
      </article>
      <article className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="size-4" />
          Validacion
        </div>
        <p className="text-xs leading-5">
          El archivo descargado no publica nada por si solo; debe subirse en
          Importaciones y pasar reglas de servidor, calidad y auditoria.
        </p>
      </article>
    </section>
  );
}

export function TemplateLibraryDashboard() {
  const [context, setContext] = useState<StoredContext | null>(null);
  const [selectedLine, setSelectedLine] =
    useState<ImportBusinessLine>("Laboratorio");
  const [notice, setNotice] = useState(
    "Selecciona una linea para descargar sus Excel de carga mensual.",
  );
  const totals = getTemplateLibraryTotals();

  useEffect(() => {
    function refreshContext() {
      const nextContext = readStoredContext();
      setContext(nextContext);
      setSelectedLine(resolveLineFromContext(nextContext));
    }

    refreshContext();
    window.addEventListener("storage", refreshContext);
    window.addEventListener(contextChangeEvent, refreshContext);

    return () => {
      window.removeEventListener("storage", refreshContext);
      window.removeEventListener(contextChangeEvent, refreshContext);
    };
  }, []);

  const periodLabel = getPeriodLabel(context);
  const summaries = getAllTemplatePackageSummaries();
  const selectedSummary = summaries.find(
    (summary) => summary.line === selectedLine,
  );
  const selectedDocuments = useMemo(
    () => selectedSummary?.documents ?? [],
    [selectedSummary],
  );

  function downloadDocumentTemplate(document: BulkImportDocument) {
    const file = buildTemplateWorkbookFile({ document, periodLabel });
    downloadWorkbook(file.fileName, file.workbookXml);
    setNotice(
      `${file.documentName} descargado para llenar ${file.periodLabel}.`,
    );
  }

  function downloadLinePackage(line: ImportBusinessLine) {
    const files = buildTemplatePackageFiles({ line, periodLabel });

    files.forEach((file, index) => {
      window.setTimeout(() => {
        downloadWorkbook(file.fileName, file.workbookXml);
      }, index * 180);
    });

    setNotice(
      `Descargando ${files.length} Excel del paquete ${line} para ${periodLabel}.`,
    );
  }

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px] xl:items-end">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
              Entorno DEMO
            </Badge>
            <Badge variant="outline">Biblioteca de Excel</Badge>
            <Badge variant="outline">Cargas masivas</Badge>
          </div>
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              Plantillas por linea de negocio
            </h1>
            <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
              Descarga los Excel que operaciones debe llenar para alimentar
              Analiza. Cada paquete incluye plantillas maestras, resultados de
              sucursal y formatos operativos segun la linea seleccionada.
            </p>
          </div>
        </div>
        <ScopeCard
          context={context}
          periodLabel={periodLabel}
          selectedLine={selectedLine}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={PackageCheck}
          label="Lineas con paquete"
          note="Consolidado, Laboratorio, Fisioterapia e Imagenes."
          value={`${totals.lines}`}
        />
        <MetricCard
          icon={FileSpreadsheet}
          label="Excel disponibles"
          note="Plantillas descargables desde esta biblioteca."
          value={`${totals.documents}`}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Obligatorias"
          note="Necesarias para que el BI no quede incompleto."
          value={`${totals.required}`}
        />
        <MetricCard
          icon={Archive}
          label="Con base previa"
          note="Incluyen ultima subida o plantilla de resultados."
          value={`${totals.latestUploads}`}
        />
        <MetricCard
          icon={GitBranch}
          label="Resultados"
          note="Plantillas mensuales por sucursal."
          value={`${totals.resultTemplates}`}
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        {importBusinessLines.map((line) => (
          <LinePackageCard
            active={selectedLine === line}
            key={line}
            line={line}
            onDownload={() => downloadLinePackage(line)}
            onSelect={() => setSelectedLine(line)}
          />
        ))}
      </section>

      <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {notice}
      </div>

      <section className="rounded-md border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">
              Excel del paquete {selectedLine}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              El paquete incluye tambien las plantillas consolidadas que esa
              linea necesita para metas, catalogos, capacidad, servicios y
              finanzas.
            </p>
          </div>
          <Button onClick={() => downloadLinePackage(selectedLine)} type="button">
            <FolderDown className="size-4" />
            Descargar todos
          </Button>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {selectedDocuments.map((document) => (
            <TemplateDocumentCard
              document={document}
              key={document.id}
              onDownload={() => downloadDocumentTemplate(document)}
            />
          ))}
        </div>
      </section>

      <UpdateFlow />
    </section>
  );
}
