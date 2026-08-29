"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Mountain,
  Mail,
  Lock,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";

const VIDEO_PRIMARY =
  "https://videos.pexels.com/video-files/856973/856973-hd_1920_1080_25fps.mp4";
const VIDEO_FALLBACK =
  "https://cdn.coverr.co/videos/coverr-hd-mountain-valley-9357/1080p.mp4";
const POSTER =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2000&q=80";

type Mode = "signin" | "signup";

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("signin");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  const toggleLight = () => {
    setLight((v) => {
      const nv = !v;
      document.documentElement.classList.toggle("light", nv);
      try {
        window.localStorage.setItem("ecovista-theme", nv ? "light" : "dark");
      } catch {}
      return nv;
    });
  };

  const handle = async () => {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    if (!email || !password) {
      setMessage({ kind: "err", text: "Please enter your email and password." });
      setLoading(false);
      return;
    }
    const res =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth`,
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    if (res.error) {
      setMessage({ kind: "err", text: res.error.message });
    } else if (mode === "signup") {
      setMessage({
        kind: "ok",
        text: "Account created! Check your email to confirm, then sign in.",
      });
      setMode("signin");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.push(next);
        router.refresh();
      }
    }
    setLoading(false);
  };

  const quickDemo = useCallback(() => {
    setMode("signin");
    setEmail("demo@ecovista.app");
    setPassword("EcoVistaDemo123!");
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* ---- Nature video background ---- */}
      <div className="absolute inset-0">
        {!videoReady && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${POSTER})` }}
          />
        )}
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={POSTER}
          onCanPlay={() => setVideoReady(true)}
        >
          <source src={VIDEO_PRIMARY} type="video/mp4" />
          <source src={VIDEO_FALLBACK} type="video/mp4" />
        </video>
        {/* Overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/75" />
      </div>

      {/* ---- Theme toggle (top-left of the gate) ---- */}
      <button
        onClick={toggleLight}
        aria-label="Toggle light/dark mode"
        className="group absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
      >
        {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        {light ? "Dark" : "Light"}
      </button>

      {/* ---- Content ---- */}
      <div
        className={`relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16 transition-colors ${
          light ? "text-slate-800" : "text-white"
        }`}
      >
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 text-white shadow-2xl shadow-emerald-500/30">
            <Mountain className="h-9 w-9" />
          </span>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Eco<span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">Vista</span>
          </h1>
          <p className="mt-3 flex max-w-md items-center justify-center gap-2 text-center text-sm text-black/70 sm:text-base dark:text-white/70">
            <Sparkles className="h-4 w-4 shrink-0" />
            Real-time India travel intelligence &amp; AI trip planning
          </p>
        </div>

        {/* Login card */}
        <div
          className={`w-full max-w-md rounded-3xl p-8 shadow-2xl backdrop-blur-xl ${
            light
              ? "border border-slate-200/70 bg-white/70"
              : "border border-white/15 bg-white/10"
          }`}
        >
          <h2 className="text-2xl font-bold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className={`mt-1 text-sm ${light ? "text-slate-600" : "text-white/60"}`}>
            {mode === "signin"
              ? "Sign in to access EcoVista."
              : "Join EcoVista to save AI-built itineraries."}
          </p>

          <div className="mt-6 space-y-3">
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-3 focus-within:ring-1 focus-within:ring-emerald-400/60 ${
                light ? "bg-slate-100" : "bg-white/10"
              }`}
            >
              <Mail className={`h-4 w-4 ${light ? "text-slate-500" : "text-white/40"}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                className={`w-full bg-transparent text-sm placeholder:opacity-60 focus:outline-none ${
                  light ? "text-slate-800 placeholder:text-slate-500" : "text-white placeholder:text-white/50"
                }`}
              />
            </div>
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-3 focus-within:ring-1 focus-within:ring-emerald-400/60 ${
                light ? "bg-slate-100" : "bg-white/10"
              }`}
            >
              <Lock className={`h-4 w-4 ${light ? "text-slate-500" : "text-white/40"}`} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handle()}
                placeholder="Password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className={`w-full bg-transparent text-sm placeholder:opacity-60 focus:outline-none ${
                  light ? "text-slate-800 placeholder:text-slate-500" : "text-white placeholder:text-white/50"
                }`}
              />
            </div>

            {message && (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  message.kind === "ok"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-rose-500/15 text-rose-300"
                }`}
              >
                {message.text}
              </p>
            )}

            <button
              onClick={handle}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 px-6 py-3.5 font-bold text-black transition hover:brightness-110 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign In" : "Sign Up"}
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm">
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className={`font-medium underline-offset-2 hover:underline ${
                light ? "text-sky-600" : "text-sky-300"
              }`}
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </button>
            <button
              onClick={quickDemo}
              className={`text-left ${light ? "text-slate-500" : "text-white/50"} hover:underline underline-offset-2`}
            >
              Use a demo account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-3 text-white/70">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="text-sm">Loading EcoVista…</p>
          </div>
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}
