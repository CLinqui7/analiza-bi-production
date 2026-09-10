"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import type { RoleKey } from "@/lib/tenant/demo-context";
import { cn } from "@/lib/utils";

type NavigationIntent = {
  href: string;
  origin: string;
};

type ProtectedNavigationContextValue = {
  beginNavigation: (href: string) => void;
  isPrefetchEnabled: (href: string) => boolean;
  pendingHref: string | null;
  prefetch: (href: string) => void;
};

type ProtectedNavigationProviderProps = {
  children: ReactNode;
  roleKey: RoleKey;
};

type NavigationLinkProps = Omit<
  ComponentProps<typeof Link>,
  "href" | "prefetch"
> & {
  href: string;
  pendingLabel: string;
};

type SearchParams = Pick<URLSearchParams, "toString">;
type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
};

const ProtectedNavigationContext =
  createContext<ProtectedNavigationContextValue | null>(null);
const navigationTimeoutMs = 12_000;
const maximumPrefetchedPaths = 12;

function currentPath(pathname: string, searchParams: SearchParams) {
  const serialized = searchParams.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

function isSamePath(left: string, right: string) {
  const origin =
    typeof window === "undefined"
      ? "https://navigation.invalid"
      : window.location.origin;
  const leftUrl = new URL(left, origin);
  const rightUrl = new URL(right, origin);
  return (
    leftUrl.pathname === rightUrl.pathname && leftUrl.search === rightUrl.search
  );
}

function canPrefetch() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const connection = (navigator as NavigatorWithConnection).connection;
  return !connection?.saveData && connection?.effectiveType !== "2g";
}

function likelyPathsFor(roleKey: RoleKey, pathname: string) {
  const managerPaths = [
    "/protected/mi-sucursal",
    "/protected/resultados",
    "/protected/metas",
    "/protected/cierres",
  ];
  const sharedPaths = ["/protected/resultados", "/protected/metas"];
  const paths = roleKey === "gerente_sucursal" ? managerPaths : sharedPaths;

  return paths.filter((path) => path !== pathname).slice(0, 2);
}

function mergeCurrentFilters(pathname: string, searchParams: SearchParams) {
  const serialized = searchParams.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

function isModifiedNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  );
}

function LinkStatus({
  isIntentPending,
  label,
}: {
  isIntentPending: boolean;
  label: string;
}) {
  const { pending } = useLinkStatus();

  if (!pending && !isIntentPending) {
    return null;
  }

  return (
    <span
      aria-live="polite"
      className="ml-auto inline-flex items-center gap-1.5 text-[0.68rem] font-medium"
      data-navigation-pending-label="true"
      role="status"
    >
      <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />
      <span>Abriendo {label}</span>
    </span>
  );
}

export function ProtectedNavigationProvider({
  children,
  roleKey,
}: ProtectedNavigationProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [intent, setIntent] = useState<NavigationIntent | null>(null);
  const [prefetchPaths, setPrefetchPaths] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const prefetchedPaths = useRef(new Set<string>());
  const current = useMemo(
    () => currentPath(pathname, searchParams),
    [pathname, searchParams],
  );

  const prefetch = useCallback((href: string) => {
    if (
      !canPrefetch() ||
      prefetchedPaths.current.has(href) ||
      prefetchedPaths.current.size >= maximumPrefetchedPaths
    ) {
      return;
    }

    prefetchedPaths.current.add(href);
    // `prefetch={true}` is the public Next API for a full dynamic-route
    // prefetch. It is opt-in only after real user intent or our small,
    // settled-route prediction set.
    setPrefetchPaths((paths) => new Set(paths).add(href));
  }, []);

  const isPrefetchEnabled = useCallback(
    (href: string) => prefetchPaths.has(href),
    [prefetchPaths],
  );

  const beginNavigation = useCallback(
    (href: string) => {
      if (isSamePath(href, current)) {
        return;
      }

      setIntent({ href, origin: current });
    },
    [current],
  );

  useEffect(() => {
    if (intent && current !== intent.origin) {
      setIntent(null);
    }
  }, [current, intent]);

  useEffect(() => {
    if (!intent) {
      return;
    }

    const timeout = window.setTimeout(
      () => setIntent(null),
      navigationTimeoutMs,
    );
    return () => window.clearTimeout(timeout);
  }, [intent]);

  useEffect(() => {
    const paths = likelyPathsFor(roleKey, pathname).map((path) =>
      mergeCurrentFilters(path, searchParams),
    );
    const warmLikelyPaths = () => {
      if (document.visibilityState === "visible") {
        paths.forEach(prefetch);
      }
    };
    const timer = window.setTimeout(warmLikelyPaths, 1_200);

    return () => window.clearTimeout(timer);
  }, [pathname, prefetch, roleKey, searchParams]);

  const value = useMemo<ProtectedNavigationContextValue>(
    () => ({
      beginNavigation,
      isPrefetchEnabled,
      pendingHref: intent?.href ?? null,
      prefetch,
    }),
    [beginNavigation, intent?.href, isPrefetchEnabled, prefetch],
  );

  return (
    <ProtectedNavigationContext.Provider value={value}>
      {children}
    </ProtectedNavigationContext.Provider>
  );
}

export function NavigationLink({
  href,
  children,
  className,
  onClick,
  onFocus,
  onMouseEnter,
  pendingLabel,
  target,
  ...props
}: NavigationLinkProps) {
  const navigation = useContext(ProtectedNavigationContext);
  const isIntentPending = navigation?.pendingHref
    ? isSamePath(navigation.pendingHref, href)
    : false;
  const shouldPrefetch = navigation?.isPrefetchEnabled(href) ?? false;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (
      !isModifiedNavigation(event) &&
      (!target || target === "_self") &&
      navigation
    ) {
      navigation.beginNavigation(href);
    }
  }

  function handleMouseEnter(event: MouseEvent<HTMLAnchorElement>) {
    onMouseEnter?.(event);
    navigation?.prefetch(href);
  }

  function handleFocus(event: FocusEvent<HTMLAnchorElement>) {
    onFocus?.(event);
    navigation?.prefetch(href);
  }

  return (
    <Link
      {...props}
      aria-busy={isIntentPending || undefined}
      className={cn(
        "transition-[opacity,filter] duration-100",
        className,
        isIntentPending && "cursor-progress opacity-70 saturate-50",
      )}
      data-navigation-link="true"
      data-navigation-feedback={isIntentPending ? "accepted" : "idle"}
      data-navigation-pending={isIntentPending ? "true" : "false"}
      href={href}
      onClick={handleClick}
      onFocus={handleFocus}
      onMouseEnter={handleMouseEnter}
      prefetch={shouldPrefetch}
      target={target}
    >
      {children}
      <LinkStatus isIntentPending={isIntentPending} label={pendingLabel} />
    </Link>
  );
}
