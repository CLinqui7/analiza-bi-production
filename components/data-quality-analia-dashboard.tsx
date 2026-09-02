"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Lightbulb,
  SearchCheck,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useActiveBusinessLine } from "@/hooks/use-active-business-line";
import {
  globalContextChangeEvent as contextChangeEvent,
  globalContextStorageKey as storageKey,
} from "@/lib/analytics/global-filters";
import {
  getExecutiveBiSnapshot,
  semanticMessages,
  type DataQualityRuleResult,
} from "@/lib/analytics/semantic-bi";
import { cn } from "@/lib/utils";

type StoredContext = {
  branchId?: string;
  branchName?: string;
  businessLineCode?: string;
  businessLineId?: string;
  businessLineName?: string;
  channelId?: string;
  companyId?: string;
  companyName?: string;
  countryId?: string;
  countryName?: string;
  managerId?: string;
  managerName?: string;
  operationalAreaId?: string;
  operationalAreaName?: string;
  payerId?: string;
  periodEnd?: string;
  periodStart?: string;
  professionalId?: string;
  serviceId?: string;
};

type ReviewFinding = {
  detail: string;
  severity: "Alta" | "Media" | "Baja";
  source: string;
  title: string;
};

type CollectionSuggestion = {
  benefit: string;
  collect: string;
  title: string;
};

function readStoredContext() {
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

function severityClass(severity: ReviewFinding["severity"]) {
  if (severity === "Alta") {
    return "border-red-200 bg-red-50 text-red-900";
  }

  if (severity === "Media") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-sky-200 bg-sky-50 text-sky-900";
}

function ruleSeverity(rule: DataQualityRuleResult): ReviewFinding["severity"] {
  if (rule.severity === "critical" || !rule.passed) {
    return "Alta";
  }

  if (rule.severity === "warning") {
    return "Media";
  }

  return "Baja";
}

function buildRuleFindings(rules: DataQualityRuleResult[]) {
  return rules
    .filter((rule) => !rule.passed)
    .slice(0, 5)
    .map(
      (rule): ReviewFinding => ({
        detail: rule.message,
        severity: ruleSeverity(rule),
        source: "Regla automatica",
        title: rule.label,
      }),
    );
}

const defaultFindings: ReviewFinding[] = [
  {
    detail:
      "Revisar ventas o costos que suben mucho contra lo habitual de la misma sucursal y periodo.",
    severity: "Media",
    source: "Comparacion mensual",
    title: "Monto demasiado alto o bajo",
  },
  {
    detail:
      "Confirmar cuando el archivo trae una sucursal, linea de negocio o mes diferente al filtro seleccionado.",
    severity: "Alta",
    source: "Importaciones",
    title: "Sucursal o periodo no cuadran",
  },
  {
    detail:
      "Buscar ordenes, pacientes, perfiles o estudios repetidos antes de alimentar resultados.",
    severity: "Media",
    source: "Validacion de duplicados",
    title: "Registros duplicados",
  },
  {
    detail:
      "No completar con cero si falta costo, capacidad, produccion o trazabilidad del archivo.",
    severity: "Alta",
    source: "Campos obligatorios",
    title: "Datos incompletos",
  },
];

const collectionSuggestions: CollectionSuggestion[] = [
  {
    benefit: "Mejorar margen real y detectar costos que explican baja utilidad.",
    collect: "Costo directo por prueba, sesion o estudio.",
    title: "Costo por servicio",
  },
  {
    benefit: "Medir ocupacion real y saber si una sucursal puede recibir mas demanda.",
    collect: "Capacidad disponible, capacidad usada y horas perdidas.",
    title: "Capacidad por sucursal",
  },
  {
    benefit: "Separar baja venta por falta de demanda, no-show o problema de agenda.",
    collect: "Cancelaciones, no-show y tiempos de espera.",
    title: "Agenda y asistencia",
  },
  {
    benefit: "Detectar problemas de calidad tecnica antes de que afecten costos o bonos.",
    collect: "Reprocesos, rechazos, repeticiones y motivos.",
    title: "Errores operativos",
  },
  {
    benefit: "Comparar desempeno por gerente sin mezclar sucursales ni periodos.",
    collect: "Gerente responsable, area, sucursal y fecha de vigencia.",
    title: "Responsables vigentes",
  },
];

export function DataQualityAnaliaDashboard() {
  const activeBusinessLine = useActiveBusinessLine();
  const [context, setContext] = useState<StoredContext | null>(null);
  const qualitySnapshot = useMemo(
    () =>
      getExecutiveBiSnapshot({
        branchId: context?.branchId,
        branchName: context?.branchName,
        businessLineCode: context?.businessLineCode,
        businessLineId: context?.businessLineId,
        businessLineName: context?.businessLineName,
        channelId: context?.channelId,
        companyId: context?.companyId,
        companyName: context?.companyName,
        countryId: context?.countryId,
        countryName: context?.countryName,
        managerId: context?.managerId,
        managerName: context?.managerName,
        operationalAreaId: context?.operationalAreaId,
        operationalAreaName: context?.operationalAreaName,
        payerId: context?.payerId,
        periodEnd: context?.periodEnd,
        periodStart: context?.periodStart,
        professionalId: context?.professionalId,
        serviceId: context?.serviceId,
      }),
    [context],
  );
  const qualityRules = useMemo(() => {
    if (qualitySnapshot.lines.length === 0) {
      return [
        {
          dimension: "completeness",
          label: "Datos faltantes",
          message: qualitySnapshot.noDataReason ?? semanticMessages.noData,
          passed: false,
          severity: "critical",
        },
        {
          dimension: "consistency",
          label: "Informacion sin comparar",
          message:
            "No hay fuente suficiente para comparar contra el comportamiento habitual.",
          passed: false,
          severity: "warning",
        },
      ] satisfies DataQualityRuleResult[];
    }

    return qualitySnapshot.lines.flatMap((line) => line.qualityRules);
  }, [qualitySnapshot]);
  const ruleFindings = buildRuleFindings(qualityRules);
  const visibleFindings =
    ruleFindings.length > 0
      ? [...ruleFindings, ...defaultFindings].slice(0, 6)
      : defaultFindings;
  const selectedScope = [
    qualitySnapshot.context.countryName,
    qualitySnapshot.context.companyName,
    qualitySnapshot.context.branchName,
  ]
    .filter(Boolean)
    .join(" / ");

  useEffect(() => {
    function refreshContext() {
      setContext(readStoredContext());
    }

    refreshContext();
    window.addEventListener("storage", refreshContext);
    window.addEventListener(contextChangeEvent, refreshContext);

    return () => {
      window.removeEventListener("storage", refreshContext);
      window.removeEventListener(contextChangeEvent, refreshContext);
    };
  }, []);

  return (
    <section className="flex w-full min-w-0 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Filtro: {activeBusinessLine.line}</Badge>
            <Badge variant="outline">Lectura para todos los roles</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border bg-card">
              <SearchCheck className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Calidad de datos
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Esta seccion muestra datos que el sistema sugiere revisar:
                valores que no cuadran, faltantes, duplicados o montos demasiado
                exagerados para lo habitual.
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-md border bg-card p-4 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <ClipboardList className="size-4 text-primary" />
            Alcance revisado
          </div>
          <p className="leading-6 text-muted-foreground">
            {selectedScope || "Filtro consolidado"}. El sistema no corrige el
            dato solo; senala lo que conviene confirmar antes de publicar o
            usar en decisiones.
          </p>
        </aside>
      </div>

      <section className="rounded-md border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="size-4 text-primary" />
              Datos que el sistema sugiere revisar
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Prioriza lo que puede afectar KPIs, bonos, cierres o lectura de
              gerencia.
            </p>
          </div>
          <Badge variant="outline">{visibleFindings.length} senales</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleFindings.map((finding, index) => (
            <article
              className={cn("rounded-md border p-4", severityClass(finding.severity))}
              key={`${finding.title}-${finding.source}-${index}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{finding.title}</h2>
                <Badge variant="secondary">{finding.severity}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6">{finding.detail}</p>
              <p className="mt-3 text-xs opacity-80">Fuente: {finding.source}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-md border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Lightbulb className="size-4 text-primary" />
          Datos que podríamos recopilar
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {collectionSuggestions.map((suggestion) => (
            <article
              className="rounded-md border bg-background p-4"
              key={suggestion.title}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="size-4 text-primary" />
                {suggestion.title}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Recopilar: {suggestion.collect}
              </p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Obtener: {suggestion.benefit}
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
