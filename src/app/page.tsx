"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    if (!base) {
      setErr("Missing NEXT_PUBLIC_API_BASE in .env.local");
      return;
    }

    fetch(`${base}/recommend`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">DoorDash Bot</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Testing frontend ↔ worker API
      </p>

      <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        {!data && !err && <p>Loading recommendation…</p>}
        {err && <p className="text-red-600">Error: {err}</p>}
        {data && (
          <pre className="text-sm overflow-auto whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}
