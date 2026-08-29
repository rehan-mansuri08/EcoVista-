"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, LogOut, Mail } from "lucide-react";

export function ProfileMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const signOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  const initial = email ? email[0].toUpperCase() : "?";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 text-sm font-bold text-black shadow-lg shadow-emerald-500/20 transition hover:brightness-110"
      >
        {open ? <User className="h-4 w-4" /> : initial}
      </button>

      {open && (
        <div className="absolute right-0 z-[1000] mt-2 w-60 overflow-hidden rounded-xl border border-white/10 glass-strong shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 text-sm font-bold text-black">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-400">Signed in as</p>
              <p className="truncate text-sm font-semibold text-white">
                {email ?? "Guest"}
              </p>
            </div>
          </div>
          <div className="border-t border-white/10" />
          <button
            onClick={signOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
