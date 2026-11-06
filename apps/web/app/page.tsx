
"use client";

import { useEffect, useState } from "react";

type Analysis = {
  id: string;
  analyzedAt: string;
  totalCommits: number;
  activeDays: number;
  contributorCount: number;
  totalFiles: number;
  healthScore: number;
  healthRating: string;
};

type HistoryResponse = {
  success: boolean;
  count: number;
  history: Analysis[];
};

export default function Home() {
  const [history, setHistory] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/api/repository/history"
        );

        if (!response.ok) {
          throw new Error("Unable to connect to the backend API.");
        }

        const data: HistoryResponse = await response.json();

        if (!data.success) {
          throw new Error("Could not retrieve analysis history.");
        }

        setHistory(data.history ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const latest = history[0];

  const metrics = [
    {
      label: "Total Commits",
      value: latest?.totalCommits ?? "—",
      icon: "↗",
      color: "text-blue-400",
    },
    {
      label: "Active Days",
      value: latest?.activeDays ?? "—",
      icon: "◷",
      color: "text-purple-400",
    },
    {
      label: "Contributors",
      value: latest?.contributorCount ?? "—",
      icon: "♧",
      color: "text-emerald-400",
    },
    {
      label: "Total Files",
      value: latest?.totalFiles ?? "—",
      icon: "▤",
      color: "text-orange-400",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0b1020] text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-[#0e1528] p-6 md:flex md:flex-col">
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold">
                R
              </div>
              <div>
                <h1 className="text-lg font-bold">RepoHealth</h1>
                <p className="text-xs text-slate-400">
                  Intelligence Platform
                </p>
              </div>
            </div>
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </p>

          <nav className="space-y-2">
            <a href="#overview" className="flex items-center gap-3 rounded-lg bg-blue-600/15 px-4 py-3 text-sm font-medium text-blue-400">
              <span>▦</span> Overview
            </a>
            <a href="#metrics" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white">
              <span>◈</span> Repository Metrics
            </a>
            <a href="#history" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white">
              <span>◷</span> Analysis History
            </a>
          </nav>

          <div className="mt-auto rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-sm font-semibold">System Status</p>
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Dashboard online
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Repository analytics platform
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#0e1528] px-5 py-5 md:px-9">
            <div>
              <p className="text-xs text-slate-500">Workspace / Overview</p>
              <h2 className="mt-1 text-xl font-bold">Repository Dashboard</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400">
                Local Analysis
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-semibold">
                M
              </div>
            </div>
          </header>

          <div id="overview" className="space-y-7 p-5 md:p-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-blue-400">REPOSITORY INTELLIGENCE</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">
                  Overview
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Monitor repository health, development activity and risks.
                </p>
              </div>
              <a href="#history" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-500">
                View analysis history →
              </a>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {error} Make sure your backend is running on port 5000.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-slate-800 bg-[#111a2e] p-5 transition hover:border-slate-600">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">{metric.label}</p>
                    <span className={`text-xl ${metric.color}`}>
                      {metric.icon}
                    </span>
                  </div>
                  <p className="mt-5 text-3xl font-bold">
                    {loading ? "..." : metric.value}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Latest repository analysis
                  </p>
                </div>
              ))}
            </div>

            <div id="metrics" className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-[#111a2e] p-6">
                <p className="text-sm font-medium text-slate-400">
                  Repository Health Score
                </p>
                <div className="mt-7 flex flex-col items-center">
                  <div className="flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-slate-700">
                    <div className="text-center">
                      <p className="text-4xl font-bold">
                        {loading ? "..." : latest?.healthScore ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500">out of 100</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm font-semibold text-slate-300">
                    {loading ? "Loading analysis..." : latest?.healthRating ?? "No analysis yet"}
                  </p>
                  <p className="mt-2 text-center text-xs text-slate-500">
                    Based on the latest saved analysis
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#111a2e] p-6 lg:col-span-2">
                <h3 className="font-semibold">Repository Summary</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Latest analysis information
                </p>

                {latest ? (
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Analysis ID</p>
                      <p className="mt-2 break-all text-sm text-slate-200">{latest.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Last Analyzed</p>
                      <p className="mt-2 text-sm text-slate-200">
                        {new Date(latest.analyzedAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Health Rating</p>
                      <p className="mt-2 text-sm text-slate-200">{latest.healthRating}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Saved Analyses</p>
                      <p className="mt-2 text-sm text-slate-200">{history.length}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 rounded-lg border border-dashed border-slate-700 p-7 text-center">
                    <p className="font-medium text-slate-300">
                      {loading ? "Loading repository data..." : "No analysis found"}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Run a repository analysis to see your metrics here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div id="history" className="overflow-hidden rounded-xl border border-slate-800 bg-[#111a2e]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-6">
                <div>
                  <h3 className="font-semibold">Recent Analysis History</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Previously saved repository analyses
                  </p>
                </div>
                <span className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-400">
                  {history.length} records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/60 text-xs text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Analysis ID</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Commits</th>
                      <th className="px-6 py-4 font-medium">Health Score</th>
                      <th className="px-6 py-4 font-medium">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="max-w-48 truncate px-6 py-4 text-blue-400">{item.id}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-400">
                          {new Date(item.analyzedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">{item.totalCommits}</td>
                        <td className="px-6 py-4 font-semibold">{item.healthScore}/100</td>
                        <td className="px-6 py-4 text-slate-300">{item.healthRating}</td>
                      </tr>
                    ))}
                    {!loading && history.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                          No saved analysis records available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="pb-4 text-center text-xs text-slate-600">
              Repository Health Intelligence Platform · Development Version
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
