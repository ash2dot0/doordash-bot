"use client";

import { useEffect, useMemo, useState } from "react";

function getOrCreateUserId() {
  const key = "ddb_user_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

type Recommendation = {
  recommended: {
    restaurant: string;
    items: string[];
    eta_minutes: number;
    estimated_total_usd: number;
    deal?: { label: string; savings_cents: number } | null;
    why?: string;
  };
  alternatives: Array<{ restaurant: string; why_not: string }>;
};

export default function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE;

  const userId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return getOrCreateUserId();
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recoLoading, setRecoLoading] = useState(false);

  const [err, setErr] = useState<string | null>(null);

  const [cuisine, setCuisine] = useState("thai");
  const [maxEta, setMaxEta] = useState(45);
  const [budgetCents, setBudgetCents] = useState(3000);

  const [reco, setReco] = useState<Recommendation | null>(null);

  async function loadMe() {
    if (!apiBase) {
      setErr("Missing NEXT_PUBLIC_API_BASE");
      setLoading(false);
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/me`, {
        headers: { "x-user-id": userId },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      const p = j.preferences;
      if (p) {
        setCuisine(p.cuisine);
        setMaxEta(p.max_eta_minutes);
        setBudgetCents(p.budget_max_cents);
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    if (!apiBase) return;
    setErr(null);
    setSaving(true);
    try {
      const r = await fetch(`${apiBase}/preferences`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          cuisine,
          max_eta_minutes: maxEta,
          budget_max_cents: budgetCents,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      await loadMe();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function getRecommendation() {
    if (!apiBase) return;
    setErr(null);
    setRecoLoading(true);
    try {
      const r = await fetch(`${apiBase}/recommend/v1`, {
        headers: { "x-user-id": userId },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setReco(j);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setRecoLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const budgetDollars = Math.round(budgetCents / 100);

  return (
    <main className="min-h-screen bg-neutral-50 p-5">
      <div className="mx-auto max-w-md space-y-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">DoorDash Bot</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Save prefs → get a pick → order in DoorDash
          </p>
        </header>

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-neutral-500">
            User ID (device):{" "}
            <span className="font-mono">{userId.slice(0, 8)}…</span>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-neutral-700">Loading…</div>
          ) : (
            <>
              {err && (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {err}
                </div>
              )}

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Cuisine</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-neutral-200"
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    placeholder="thai, indian, mexican…"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Max ETA (minutes)
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-neutral-200"
                    type="number"
                    value={maxEta}
                    onChange={(e) => setMaxEta(Number(e.target.value))}
                    min={10}
                    max={180}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Budget max (approx) — ${budgetDollars}
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-neutral-200"
                    type="number"
                    value={budgetDollars}
                    onChange={(e) =>
                      setBudgetCents(Math.max(0, Number(e.target.value)) * 100)
                    }
                    min={5}
                    max={500}
                  />
                </div>

                <button
                  onClick={savePreferences}
                  disabled={saving}
                  className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-base font-medium text-white shadow-sm active:scale-[0.99] disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save preferences"}
                </button>

                <button
                  onClick={getRecommendation}
                  disabled={recoLoading}
                  className="w-full rounded-xl bg-[#EB1700] px-4 py-3 text-base font-semibold text-white shadow-sm active:scale-[0.99] disabled:opacity-60"
                >
                  {recoLoading ? "Picking your order…" : "Order the usual"}
                </button>
              </div>
            </>
          )}
        </section>

        {reco && (
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold">Recommended</div>

            <div className="mt-2 text-lg font-semibold">
              {reco.recommended.restaurant}
            </div>

            <div className="mt-1 text-sm text-neutral-600">
              {reco.recommended.eta_minutes} min · $
              {reco.recommended.estimated_total_usd.toFixed(2)}
              {reco.recommended.deal?.label ? ` · ${reco.recommended.deal.label}` : ""}
            </div>

            {reco.recommended.why && (
              <div className="mt-2 text-sm text-neutral-700">
                {reco.recommended.why}
              </div>
            )}

            <ul className="mt-3 space-y-1 text-sm text-neutral-800">
              {reco.recommended.items.map((it) => (
                <li key={it} className="flex items-start gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-neutral-400" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>

            <button
              className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-3 text-base font-medium text-white shadow-sm active:scale-[0.99]"
              onClick={() => alert("Deep link to DoorDash comes in Step 5")}
            >
              Order via DoorDash
            </button>

            {reco.alternatives?.length > 0 && (
              <div className="mt-5">
                <div className="text-sm font-semibold">Other options</div>
                <div className="mt-2 space-y-2">
                  {reco.alternatives.map((a) => (
                    <div key={a.restaurant} className="rounded-xl border p-3">
                      <div className="text-sm font-medium">{a.restaurant}</div>
                      <div className="mt-1 text-xs text-neutral-600">
                        {a.why_not}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
