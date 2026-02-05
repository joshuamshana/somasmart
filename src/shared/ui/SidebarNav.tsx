import React from "react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";

type NavItem = {
  label: string;
  to: string;
};

type Group = {
  label: string;
  items: NavItem[];
};

function useWithSearch(to: string) {
  const location = useLocation();
  return location.search && !to.includes("?") ? `${to}${location.search}` : to;
}

export function SidebarNav({
  groups,
  onNavigate
}: {
  groups: Group[];
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const pathname = location.pathname;

  // Choose a single "best match" to avoid multiple items highlighted when paths share prefixes
  // (e.g. "/teacher/lessons" and "/teacher/lessons/new").
  const bestActiveTo = React.useMemo(() => {
    let best: string | null = null;
    for (const g of groups) {
      for (const i of g.items) {
        const to = i.to;
        const matches =
          to === "/admin" ? pathname === "/admin" : pathname === to || pathname.startsWith(`${to}/`);
        if (!matches) continue;
        if (!best || to.length > best.length) best = to;
      }
    }
    return best;
  }, [groups, pathname]);

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</div>
          <div className="mt-2 space-y-1">
            {g.items.map((i) => {
              const target = useWithSearch(i.to);
              const active = bestActiveTo === i.to;
              return (
                <Link
                  key={i.to}
                  to={target}
                  onClick={onNavigate}
                  className={clsx(
                    "block rounded-lg px-3 py-2 text-sm",
                    active ? "bg-surface2 text-text" : "text-muted hover:bg-surface2/60 hover:text-text"
                  )}
                >
                  {i.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
