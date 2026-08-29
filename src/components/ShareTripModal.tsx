"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, LogOut } from "lucide-react";

export function ShareTripModal({ tripId }: { tripId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sharers, setSharers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addSharer = () => {
    if (!email) return;
    const clean = email.trim().toLowerCase();
    if (!sharers.includes(clean)) {
      setSharers([...sharers, clean]);
    }
    setEmail("");
  };

  const removeSharer = (e: string) =>
    setSharers(sharers.filter((s) => s !== e));

  const save = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("user_trips")
      .update({ shared_with: sharers })
      .eq("id", tripId);
    if (error) alert("Share update failed: " + error.message);
    else {
      alert("Trip shared with " + sharers.length + " collaborator" + (sharers.length !== 1 ? "s" : "") + ".");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-zxl z-[1000] flex items-center justify-center p-4">
      <div className="rounded-2xl glass p-6 max-w-md w-full">
        <h3 className="mb-4 text-lg font-bold">Share Trip</h3>
        <p className="mb-4 text-sm text-zinc-400">
          Enter collaborator emails below. They'll receive access to view and edit the trip activities.
        </p>
        <div className="mb-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
            autoComplete="email"
          />
          <button
            onClick={addSharer}
            className="mt-2 rounded-xl bg-emerald-400/15 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/25 disabled:opacity-60"
            disabled={!email}
          >
            Add
          </button>
        </div>
        <div>
          <h4 className="font-medium mb-2 text-zinc-300">Current collaborators:</h4>
          {sharers.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
              {s}
              <button
                onClick={() => removeSharer(s)}
                className="ml-2 text-[10px] underline text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <button onClick={save} disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-sky-500 px-5 py-3 font-bold text-black transition-hover hover:scale-[1.02]">
            {loading ? "Saving…" : "Save Share"}
          </button>
        </div>
      </div>
    </div>
  );
}