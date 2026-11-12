
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Analysis data from PostgreSQL
type Analysis = {
  id: string;
  analyzedAt: string;
  totalCommits: number;
  activeDays: number;
  contributorCount: number;
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  totalChurn: number;
  estimatedBusFactor: number;
  stagnantFiles: number;
  healthScore: number;
  healthRating: string;
};

// Contributor information
type Contributor = {
  author: string;
  commits: number;
  percentage: number;
};

type HistoryResponse = {
  success: boolean;
  count: number;
  history: Analysis[];
};

const API_URL = "http://127.0.0.1:5000/api/repository";

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
];

export default function Home() {
  const [history, setHistory] = useState<Analysis[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [comparisonId, setComparisonId] = useState("");

  // Load dashboard data from the backend API
  // Manual refresh updates data without reloading the browser page.
  const loadDashboard = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(`${API_URL}/history`);

      if (!response.ok) {
        throw new Error("Unable to connect to the backend API.");
      }

      const data: HistoryResponse = await response.json();

      if (!data.success) {
        throw new Error("Could not retrieve analysis history.");
      }

      const analyses = data.history ?? [];

      setHistory(analyses);

      // Fetch contributors for the latest analysis
      if (analyses.length > 0) {
        const latestAnalysis = analyses[0];

        const detailResponse = await fetch(
          `${API_URL}/history/${latestAnalysis.id}`
        );

        if (!detailResponse.ok) {
          throw new Error("Unable to load contributor details.");
        }

        const detailData = await detailResponse.json();

        setContributors(
          detailData.analysis?.contributors ?? []
        );
      } else {
        setContributors([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load dashboard data when the page first opens
  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Trigger a new repository analysis and refresh the dashboard
  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      setAnalyzeError("");

      const response = await fetch(`${API_URL}/analyze`);

      if (!response.ok) {
        throw new Error("Analysis request failed.");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message ?? "Analysis failed.");
      }

      await loadDashboard(true);
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : "Analysis failed."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const latest = history[0];

  // Export analysis history as CSV
  const exportCSV = () => {
    const headers = [
      "Analysis ID",
      "Date",
      "Total Commits",
      "Active Days",
      "Contributors",
      "Total Files",
      "Lines Added",
      "Lines Deleted",
      "Code Churn",
      "Bus Factor",
      "Stagnant Files",
      "Health Score",
      "Health Rating",
    ];

    const rows = history.map((item) => [
      item.id,
      new Date(item.analyzedAt).toLocaleString(),
      item.totalCommits,
      item.activeDays,
      item.contributorCount,
      item.totalFiles,
      item.totalAdditions,
      item.totalDeletions,
      item.totalChurn,
      item.estimatedBusFactor,
      item.stagnantFiles,
      item.healthScore,
      item.healthRating,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `repo-health-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Repository health score trend
  const healthTrendData = [...history]
    .reverse()
    .map((item) => ({
      date: new Date(item.analyzedAt).toLocaleDateString(),
      healthScore: item.healthScore,
    }));

  // Previous analysis selected for comparison
  const previousAnalysis =
    history.find((item) => item.id === comparisonId) ?? history[1];

  // Calculate differences between latest and previous analysis
  const comparisonMetrics =
    previousAnalysis && latest
      ? [
          {
            label: "Health Score",
            current: latest.healthScore,
            previous: previousAnalysis.healthScore,
            difference: latest.healthScore - previousAnalysis.healthScore,
          },
          {
            label: "Code Churn",
            current: latest.totalChurn,
            previous: previousAnalysis.totalChurn,
            difference: latest.totalChurn - previousAnalysis.totalChurn,
          },
          {
            label: "Total Commits",
            current: latest.totalCommits,
            previous: previousAnalysis.totalCommits,
            difference: latest.totalCommits - previousAnalysis.totalCommits,
          },
          {
            label: "Stagnant Files",
            current: latest.stagnantFiles,
            previous: previousAnalysis.stagnantFiles,
            difference: latest.stagnantFiles - previousAnalysis.stagnantFiles,
          },
        ]
      : [];

  // Code churn chart data
  const codeChangesData = latest
    ? [
        {
          name: "Additions",
          lines: latest.totalAdditions,
        },
        {
          name: "Deletions",
          lines: latest.totalDeletions,
        },
      ]
    : [];

  // Repository metric cards
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
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-[#0e1528] p-6 md:flex md:flex-col">
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold">
                R
              </div>

              <div>
                <h1 className="text-lg font-bold">
                  RepoHealth
                </h1>

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
            <a
              href="#overview"
              className="flex items-center gap-3 rounded-lg bg-blue-600/15 px-4 py-3 text-sm font-medium text-blue-400"
            >
              <span>▦</span>
              Overview
            </a>

            <a
              href="#metrics"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <span>◈</span>
              Repository Metrics
            </a>

            <a
              href="#comparison"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <span>⇄</span>
              Analysis Comparison
            </a>

            <a
              href="#history"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <span>◷</span>
              Analysis History
            </a>
          </nav>

          <div className="mt-auto rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-sm font-semibold">
              System Status
            </p>

            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Dashboard online
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Repository analytics platform
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <section className="min-w-0 flex-1">
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#0e1528] px-5 py-5 md:px-9">
            <div>
              <p className="text-xs text-slate-500">
                Workspace / Overview
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Repository Dashboard
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400">
                Local Analysis
              </span>

              {/* Run Analysis Button */}
              <button
                type="button"
                onClick={() => void runAnalysis()}
                disabled={analyzing || loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                title="Run a new repository analysis"
              >
                <span className={analyzing ? "animate-spin" : ""}>⚙</span>
                {analyzing ? "Analyzing..." : "Run Analysis"}
              </button>

              {/* Dashboard Refresh Button */}
              <button
                type="button"
                onClick={() => void loadDashboard(true)}
                disabled={refreshing || loading}
                className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                title="Refresh Dashboard"
              >
                <span className={refreshing ? "animate-spin" : ""}>
                  ↻
                </span>

                {refreshing
                  ? "Refreshing..."
                  : loading
                    ? "Loading..."
                    : "Refresh"}
              </button>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-semibold">
                M
              </div>
            </div>
          </header>

          <div
            id="overview"
            className="space-y-7 p-5 md:p-9"
          >
            {/* Page Heading */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-blue-400">
                  REPOSITORY INTELLIGENCE
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight">
                  Overview
                </h1>

                <p className="mt-2 text-sm text-slate-400">
                  Monitor repository health, development activity and risks.
                </p>
              </div>

              <a
                href="#history"
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-500"
              >
                View analysis history →
              </a>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {error}
                {" "}Make sure your backend is running on port 5000.
              </div>
            )}

            {/* Analysis Error */}
            {analyzeError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                Analysis failed: {analyzeError}
              </div>
            )}

            {/* Repository Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-slate-800 bg-[#111a2e] p-5 transition hover:border-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">
                      {metric.label}
                    </p>

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

            {/* Code Churn Analytics */}
            <div
              id="metrics"
              className="rounded-xl border border-slate-800 bg-[#111a2e] p-6"
            >
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    Code Churn Analytics
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Comparison of code additions and deletions
                  </p>
                </div>

                <span className="rounded-md bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400">
                  Latest Analysis
                </span>
              </div>

              {latest ? (
                <>
                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-slate-900 p-4">
                      <p className="text-xs text-slate-400">
                        Lines Added
                      </p>

                      <p className="mt-2 text-2xl font-bold text-emerald-400">
                        {latest.totalAdditions.toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-900 p-4">
                      <p className="text-xs text-slate-400">
                        Lines Deleted
                      </p>

                      <p className="mt-2 text-2xl font-bold text-red-400">
                        {latest.totalDeletions.toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-900 p-4">
                      <p className="text-xs text-slate-400">
                        Total Churn
                      </p>

                      <p className="mt-2 text-2xl font-bold text-blue-400">
                        {latest.totalChurn.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={codeChangesData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#334155"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="name"
                          stroke="#94a3b8"
                        />

                        <YAxis stroke="#94a3b8" />

                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0e1528",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#ffffff",
                          }}
                        />

                        <Bar
                          dataKey="lines"
                          name="Lines of code"
                          fill="#3b82f6"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <p className="py-12 text-center text-slate-500">
                  {loading
                    ? "Loading code change data..."
                    : "No code change data available."}
                </p>
              )}
            </div>

            {/* Contributor Distribution */}
            <div className="rounded-xl border border-slate-800 bg-[#111a2e] p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">
                  Contributor Distribution
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Contribution share by repository contributor
                </p>
              </div>

              {loading ? (
                <p className="py-12 text-center text-slate-500">
                  Loading contributor data...
                </p>
              ) : contributors.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Pie Chart */}
                  <div className="h-72 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={contributors}
                          dataKey="commits"
                          nameKey="author"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {contributors.map((contributor, index) => (
                            <Cell
                              key={contributor.author}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>

                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0e1528",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#ffffff",
                          }}
                        />

                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Contributor Details */}
                  <div className="space-y-4">
                    {contributors.map((contributor, index) => (
                      <div
                        key={`${contributor.author}-${index}`}
                        className="rounded-lg bg-slate-900 p-4"
                      >
                        <div className="flex flex-wrap justify-between gap-3">
                          <span className="text-sm font-medium">
                            {contributor.author}
                          </span>

                          <span className="text-sm font-semibold text-blue-400">
                            {contributor.percentage.toFixed(1)}%
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-400">
                          {contributor.commits} commits
                        </p>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, contributor.percentage)
                              )}%`,
                              backgroundColor:
                                CHART_COLORS[index % CHART_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-12 text-center text-slate-500">
                  No contributor data available.
                </p>
              )}
            </div>

            {/* Repository Risk Analysis */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Bus Factor */}
              <div className="rounded-xl border border-slate-800 bg-[#111a2e] p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Bus Factor
                  </h3>

                  <span className="text-xl text-orange-400">
                    ⚠
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Contributor concentration risk
                </p>

                <p className="mt-6 text-4xl font-bold text-orange-400">
                  {loading ? "..." : latest?.estimatedBusFactor ?? "—"}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  Estimated contributors accounting for at least 50% of commits
                </p>

                <div className="mt-5 rounded-lg bg-orange-500/10 p-3 text-sm text-orange-300">
                  {latest?.estimatedBusFactor === 1
                    ? "High concentration: one contributor accounts for at least half of commits."
                    : "Review contributor distribution to assess knowledge concentration."}
                </div>
              </div>

              {/* Stagnant Files */}
              <div className="rounded-xl border border-slate-800 bg-[#111a2e] p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Stagnant Files
                  </h3>

                  <span className="text-xl text-red-400">
                    ◷
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Repository maintenance indicator
                </p>

                <p className="mt-6 text-4xl font-bold text-red-400">
                  {loading ? "..." : latest?.stagnantFiles ?? "—"}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  Files unchanged for more than 30 days
                </p>

                <div className="mt-5 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
                  Review these files to identify potentially outdated code.
                </div>
              </div>
            </div>

            {/* Health Score and Repository Summary */}
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Health Score */}
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

                      <p className="text-xs text-slate-500">
                        out of 100
                      </p>
                    </div>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-slate-300">
                    {loading
                      ? "Loading analysis..."
                      : latest?.healthRating ?? "No analysis yet"}
                  </p>

                  <p className="mt-2 text-center text-xs text-slate-500">
                    Based on the latest saved analysis
                  </p>
                </div>
              </div>

              {/* Repository Summary */}
              <div className="rounded-xl border border-slate-800 bg-[#111a2e] p-6 lg:col-span-2">
                <h3 className="font-semibold">
                  Repository Summary
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Latest analysis information
                </p>

                {latest ? (
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">
                        Analysis ID
                      </p>

                      <p className="mt-2 break-all text-sm text-slate-200">
                        {latest.id}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Last Analyzed
                      </p>

                      <p className="mt-2 text-sm text-slate-200">
                        {new Date(latest.analyzedAt).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Health Rating
                      </p>

                      <p className="mt-2 text-sm text-slate-200">
                        {latest.healthRating}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Saved Analyses
                      </p>

                      <p className="mt-2 text-sm text-slate-200">
                        {history.length}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Estimated Bus Factor
                      </p>

                      <p className="mt-2 text-sm text-slate-200">
                        {latest.estimatedBusFactor}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Stagnant Files
                      </p>

                      <p className="mt-2 text-sm text-slate-200">
                        {latest.stagnantFiles}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 rounded-lg border border-dashed border-slate-700 p-7 text-center">
                    <p className="font-medium text-slate-300">
                      {loading
                        ? "Loading repository data..."
                        : "No analysis found"}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Run a repository analysis to see your metrics here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Repository Health Trend */}
            <div className="rounded-xl border border-slate-800 bg-[#111a2e] p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">
                  Repository Health Trend
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Historical repository health score progression
                </p>
              </div>

              {healthTrendData.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={healthTrendData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#334155"
                      />

                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                      />

                      <YAxis
                        domain={[0, 100]}
                        stroke="#94a3b8"
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0e1528",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          color: "#ffffff",
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="healthScore"
                        name="Health Score"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ r: 5, fill: "#3b82f6" }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-12 text-center text-slate-500">
                  No health trend data available.
                </p>
              )}
            </div>

            {/* Historical Analysis Comparison */}
            <div
              id="comparison"
              className="rounded-xl border border-slate-800 bg-[#111a2e] p-6"
            >
              <div className="mb-6">
                <h3 className="text-lg font-semibold">
                  Historical Analysis Comparison
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Compare the latest repository analysis with a previous saved analysis.
                </p>
              </div>

              {latest && history.length > 1 ? (
                <>
                  <div className="mb-6">
                    <label
                      htmlFor="comparison-analysis"
                      className="mb-2 block text-sm text-slate-400"
                    >
                      Select previous analysis
                    </label>

                    <select
                      id="comparison-analysis"
                      value={previousAnalysis?.id ?? ""}
                      onChange={(event) => setComparisonId(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                    >
                      {history.slice(1).map((item) => (
                        <option key={item.id} value={item.id}>
                          {new Date(item.analyzedAt).toLocaleString()} — Health score{" "}
                          {item.healthScore}/100
                        </option>
                      ))}
                    </select>
                  </div>

                  {previousAnalysis && (
                    <>
                      <div className="mb-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-slate-900 p-4">
                          <p className="text-xs text-slate-500">
                            Latest analysis
                          </p>

                          <p className="mt-2 break-all text-sm font-medium text-slate-200">
                            {latest.id}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(latest.analyzedAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="rounded-lg bg-slate-900 p-4">
                          <p className="text-xs text-slate-500">
                            Previous analysis
                          </p>

                          <p className="mt-2 break-all text-sm font-medium text-slate-200">
                            {previousAnalysis.id}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(previousAnalysis.analyzedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {comparisonMetrics.map((metric) => {
                          const isHealthScore =
                            metric.label === "Health Score";

                          const isStagnantFiles =
                            metric.label === "Stagnant Files";

                          const isPositive =
                            (isHealthScore && metric.difference > 0) ||
                            (isStagnantFiles && metric.difference < 0);

                          const isNegative =
                            (isHealthScore && metric.difference < 0) ||
                            (isStagnantFiles && metric.difference > 0);

                          return (
                            <div
                              key={metric.label}
                              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
                            >
                              <p className="text-sm text-slate-400">
                                {metric.label}
                              </p>

                              <p className="mt-4 text-2xl font-bold text-white">
                                {metric.current.toLocaleString()}
                              </p>

                              <p className="mt-2 text-xs text-slate-500">
                                Previous: {metric.previous.toLocaleString()}
                              </p>

                              <p
                                className={`mt-3 text-sm font-semibold ${
                                  isPositive
                                    ? "text-emerald-400"
                                    : isNegative
                                      ? "text-red-400"
                                      : "text-blue-400"
                                }`}
                              >
                                {metric.difference > 0 ? "+" : ""}
                                {metric.difference.toLocaleString()}{" "}
                                {metric.difference === 0 ? "No change" : "change"}
                              </p>

                              {(isHealthScore || isStagnantFiles) && (
                                <p
                                  className={`mt-1 text-xs ${
                                    isPositive
                                      ? "text-emerald-400"
                                      : isNegative
                                        ? "text-red-400"
                                        : "text-slate-500"
                                  }`}
                                >
                                  {metric.difference === 0
                                    ? "No change in this metric"
                                    : isPositive
                                      ? "Favorable change"
                                      : isNegative
                                        ? "Needs attention"
                                        : ""}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="rounded-lg bg-slate-900 p-6 text-center text-sm text-slate-400">
                  At least two saved analyses are required for comparison.
                </p>
              )}
            </div>

            {/* Analysis History */}
            <div
              id="history"
              className="overflow-hidden rounded-xl border border-slate-800 bg-[#111a2e]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-6">
                <div>
                  <h3 className="font-semibold">
                    Recent Analysis History
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Previously saved repository analyses
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={exportCSV}
                    disabled={history.length === 0}
                    className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Export analysis history as CSV"
                  >
                    ⬇ Export CSV
                  </button>

                  <span className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-400">
                    {history.length} records
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/60 text-xs text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Analysis ID</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Commits</th>
                      <th className="px-6 py-4 font-medium">Additions</th>
                      <th className="px-6 py-4 font-medium">Deletions</th>
                      <th className="px-6 py-4 font-medium">Code Churn</th>
                      <th className="px-6 py-4 font-medium">Health Score</th>
                      <th className="px-6 py-4 font-medium">Rating</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {history.map((item) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-800/40"
                      >
                        <td className="max-w-48 truncate px-6 py-4 text-blue-400">
                          {item.id}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-slate-400">
                          {new Date(item.analyzedAt).toLocaleDateString()}
                        </td>

                        <td className="px-6 py-4">
                          {item.totalCommits}
                        </td>

                        <td className="px-6 py-4 text-emerald-400">
                          {item.totalAdditions.toLocaleString()}
                        </td>

                        <td className="px-6 py-4 text-red-400">
                          {item.totalDeletions.toLocaleString()}
                        </td>

                        <td className="px-6 py-4 text-blue-400">
                          {item.totalChurn.toLocaleString()}
                        </td>

                        <td className="px-6 py-4 font-semibold">
                          {item.healthScore}/100
                        </td>

                        <td className="px-6 py-4 text-slate-300">
                          {item.healthRating}
                        </td>
                      </tr>
                    ))}

                    {!loading && history.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-8 text-center text-slate-500"
                        >
                          No saved analysis records available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <p className="pb-4 text-center text-xs text-slate-600">
              Repository Health Intelligence Platform · Development Version
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
