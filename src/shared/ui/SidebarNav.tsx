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

function isActive(pathname: string, to: string) {
  if (to === "/admin") return pathname === "/admin";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function SidebarNav({
  groups,
  onNavigate
}: {
  groups: Group[];
  onNavigate?: () => void;
}) {
  const location = useLocation();
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</div>
          <div className="mt-2 space-y-1">
            {g.items.map((i) => {
              const target = useWithSearch(i.to);
              const active = isActive(location.pathname, i.to);
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

