"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const options = { email, password };
    const res =
      mode === "signup"
        ? await supabase.auth.signUp(options)
        : await supabase.auth.signInWithPassword(options);
    if (res.error) {
      setMessage(res.error.message);
    } else {
      setMessage(
        mode === "signup"
          ? "Check your email to confirm your account, then sign in."
          : "Signed in! You can now save trips."
      );
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="glass-strong rounded-3xl p-8">
        <h1 className="text-2xl font-bold">
          {mode === "signin" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {mode === "signin"
            ? "Sign in to sync your trips with EcoVista."
            : "Join EcoVista to save AI-built itineraries."}
        </p>

        <div className="mt-5 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
          />
          <button
            onClick={handle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 px-6 py-3 font-bold text-black disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
          {message && <p className="text-sm text-emerald-300">{message}</p>}
        </div>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-sm text-sky-400 hover:underline"
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
