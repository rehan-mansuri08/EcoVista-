"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mountain, Search, Sparkles, Map as MapIcon, Compass } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/planner", label: "Plan Trip", icon: Sparkles },
  { href: "/search", label: "Search", icon: Search },
];

export function Navbar() {
  const pathname = usePathname();

  if (pathname === "/auth") return null;

  return (
    <header className="sticky top-0 z-50 glass-strong">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 text-black shadow-lg shadow-emerald-500/20">
            <Mountain className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Eco<span className="text-gradient">Vista</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/" && href !== "/search" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          <div className="mr-1 hidden sm:block">
            <ThemeToggle />
          </div>
          <Link
            href="/planner"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-400/15 px-3 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/25"
          >
            <Sparkles className="h-4 w-4" />
            <span className="sm:hidden">Plan</span>
            <span className="hidden sm:inline">AI Plan Trip</span>
          </Link>
          <div className="ml-1 sm:hidden">
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
}
