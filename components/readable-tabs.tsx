"use client";

import { type ReactNode, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export type ReadableTabItem = {
  id: string;
  label: string;
  description: string;
  children: ReactNode;
};

type ReadableTabsProps = {
  activeTabId?: string;
  tabs: ReadableTabItem[];
  defaultTabId?: string;
  label?: string;
  onTabChange?: (tabId: string) => void;
};

export function ReadableTabs({
  activeTabId,
  defaultTabId,
  label = "Secciones de lectura",
  onTabChange,
  tabs,
}: ReadableTabsProps) {
  const initialTabId = defaultTabId ?? tabs[0]?.id ?? "";
  const [uncontrolledTabId, setUncontrolledTabId] = useState(initialTabId);
  const selectedTabId = activeTabId ?? uncontrolledTabId;
  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0],
    [selectedTabId, tabs],
  );

  function selectTab(tabId: string) {
    setUncontrolledTabId(tabId);
    onTabChange?.(tabId);
  }

  if (!activeTab) {
    return null;
  }

  return (
    <section className="grid min-w-0 gap-4" aria-label={label}>
      <div className="rounded-md border bg-card p-3">
        <label className="grid gap-2 text-sm sm:hidden">
          <span className="font-medium">{label}</span>
          <select
            className="h-10 rounded-md border bg-background px-3 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => selectTab(event.target.value)}
            value={activeTab.id}
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </label>

        <div className="hidden gap-2 sm:flex sm:flex-wrap" role="tablist">
          {tabs.map((tab) => {
            const active = tab.id === activeTab.id;

            return (
              <button
                aria-controls={`${tab.id}-panel`}
                aria-selected={active}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
                id={`${tab.id}-tab`}
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                role="tab"
                type="button"
              >
                <span className="block font-medium">{tab.label}</span>
                <span className="mt-1 block text-xs opacity-80">
                  {tab.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        aria-labelledby={`${activeTab.id}-tab`}
        className="grid min-w-0 gap-4"
        id={`${activeTab.id}-panel`}
        role="tabpanel"
      >
        {activeTab.children}
      </div>
    </section>
  );
}
