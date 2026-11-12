
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

type Commit = {
  hash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  additions: number;
  deletions: number;
  churn: number;
};

type ScoreBreakdown = {
  activity: number;
  collaboration: number;
  knowledge: number;
  maintenance: number;
};

type AnalysisDetail = Analysis & {
  scoreBreakdown: ScoreBreakdown;
  contributors: Contributor[];
  commits: Commit[];
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

  // Individual analysis detail panel
  const [detailPanel, setDetailPanel] = useState<AnalysisDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Analysis History Controls: Search, Filter, Sort, Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "score-desc" | "score-asc">("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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

  // Open individual analysis detail panel
  const openDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      setDetailError("");
      setDetailPanel(null);

      const response = await fetch(`${API_URL}/history/${id}`);

      if (!response.ok) throw new Error("Failed to load analysis details.");

      const data = await response.json();

      if (!data.success) throw new Error(data.message ?? "Failed to load details.");

      setDetailPanel(data.analysis as AnalysisDetail);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load details.");
    } finally {
      setDetailLoading(false);
    }
  };

  // Navigate to previous / next analysis in the detail panel
  const navigateDetail = (direction: "prev" | "next") => {
    if (!detailPanel) return;
    const idx = history.findIndex((h) => h.id === detailPanel.id);
    const nextIdx = direction === "next" ? idx + 1 : idx - 1;
    if (nextIdx >= 0 && nextIdx < history.length) {
      void openDetail(history[nextIdx].id);
    }
  };

  const latest = history[0];

  // Export analysis history as CSV
  // ── Risk helpers ──────────────────────────────────────────────────────────

  type RiskLevel = "Critical" | "High" | "Medium" | "Low";

  const getRiskLevel = (score: number): RiskLevel => {
    if (score >= 80) return "Low";
    if (score >= 60) return "Medium";
    if (score >= 40) return "High";
    return "Critical";
  };

  const RISK_META: Record<RiskLevel, { color: string; bg: string; border: string; dot: string }> = {
    Critical: { color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/40",    dot: "bg-red-400"    },
    High:     { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/40", dot: "bg-orange-400" },
    Medium:   { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/40", dot: "bg-yellow-400" },
    Low:      { color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/40",dot: "bg-emerald-400"},
  };

  // Bus-factor risk: 1 = Critical, 2 = High, 3 = Medium, 4+ = Low
  const getBusFactorRisk = (bf: number): RiskLevel => {
    if (bf <= 1) return "Critical";
    if (bf === 2) return "High";
    if (bf === 3) return "Medium";
    return "Low";
  };

  // Stagnant-file risk based on % of total files stagnant
  const getStagnantRisk = (stagnant: number, total: number): RiskLevel => {
    if (total === 0) return "Low";
    const pct = (stagnant / total) * 100;
    if (pct >= 60) return "Critical";
    if (pct >= 40) return "High";
    if (pct >= 20) return "Medium";
    return "Low";
  };

  // Contributor concentration risk based on top-contributor share
  const getConcentrationRisk = (topPct: number): RiskLevel => {
    if (topPct >= 80) return "Critical";
    if (topPct >= 60) return "High";
    if (topPct >= 40) return "Medium";
    return "Low";
  };

  // Derive risk values from latest analysis
  const healthRisk     = latest ? getRiskLevel(latest.healthScore) : ("Low" as RiskLevel);
  const busFactorRisk  = latest ? getBusFactorRisk(latest.estimatedBusFactor) : ("Low" as RiskLevel);
  const stagnantRisk   = latest ? getStagnantRisk(latest.stagnantFiles, latest.totalFiles) : ("Low" as RiskLevel);
  const topContribPct  = contributors[0]?.percentage ?? 0;
  const concentrationRisk = getConcentrationRisk(topContribPct);

  // Overall risk = worst of all individual risks
  const riskOrder: RiskLevel[] = ["Critical", "High", "Medium", "Low"];
  const overallRisk: RiskLevel = [healthRisk, busFactorRisk, stagnantRisk, concentrationRisk]
    .sort((a, b) => riskOrder.indexOf(a) - riskOrder.indexOf(b))[0];

  // Risk category counts (for summary badges)
  const riskItems: RiskLevel[] = [healthRisk, busFactorRisk, stagnantRisk, concentrationRisk];
  const riskCounts = riskOrder.reduce<Record<RiskLevel, number>>((acc, r) => {
    acc[r] = riskItems.filter((x) => x === r).length;
    return acc;
  }, { Critical: 0, High: 0, Medium: 0, Low: 0 });

  // ── CSV export ────────────────────────────────────────────────────────────

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

  // Filter and sort analysis history
  const filteredHistory = useMemo(() => {
    return history
      .filter((item) => {
        // Filter by health rating
        if (
          ratingFilter !== "ALL" &&
          item.healthRating.toLowerCase() !== ratingFilter.toLowerCase()
        ) {
          return false;
        }

        // Search by ID, date, or rating
        if (searchTerm.trim()) {
          const term = searchTerm.trim().toLowerCase();
          const matchId = item.id.toLowerCase().includes(term);
          const matchDate = new Date(item.analyzedAt)
            .toLocaleDateString()
            .toLowerCase()
            .includes(term);
          const matchRating = item.healthRating.toLowerCase().includes(term);
          if (!matchId && !matchDate && !matchRating) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") {
          return new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime();
        }
        if (sortBy === "date-asc") {
          return new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime();
        }
        if (sortBy === "score-desc") {
          return b.healthScore - a.healthScore;
        }
        if (sortBy === "score-asc") {
          return a.healthScore - b.healthScore;
        }
        return 0;
      });
  }, [history, ratingFilter, searchTerm, sortBy]);

  // Reset to first page whenever filter, search, sort or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, ratingFilter, sortBy, pageSize]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, currentPage, pageSize]);

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
              href="#risk"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <span>⚠</span>
              Risk Visualization
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

            {/* ── Advanced Repository Risk Visualization ── */}
            <div id="risk" className="rounded-xl border border-slate-800 bg-[#111a2e] p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Repository Risk Visualization</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Risk severity across key repository health indicators
                  </p>
                </div>

                {/* Overall risk badge */}
                {latest && (
                  <span
                    className={`rounded-lg border px-4 py-1.5 text-sm font-semibold ${RISK_META[overallRisk].color} ${RISK_META[overallRisk].bg} ${RISK_META[overallRisk].border}`}
                  >
                    Overall Risk: {overallRisk}
                  </span>
                )}
              </div>

              {latest ? (
                <>
                  {/* Risk Summary Badges */}
                  <div className="mb-6 flex flex-wrap gap-3">
                    {riskOrder.map((level) => (
                      <div
                        key={level}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${RISK_META[level].bg} ${RISK_META[level].border}`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${RISK_META[level].dot}`} />
                        <span className={`text-sm font-semibold ${RISK_META[level].color}`}>
                          {level}
                        </span>
                        <span className="ml-1 text-sm text-slate-400">
                          {riskCounts[level]}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Risk Indicator Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                    {/* Health Score Risk */}
                    {(() => {
                      const meta = RISK_META[healthRisk];
                      return (
                        <div className={`rounded-xl border p-5 ${meta.bg} ${meta.border}`}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400">Health Score</p>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${meta.color} ${meta.bg}`}>
                              {healthRisk}
                            </span>
                          </div>
                          <p className={`mt-4 text-3xl font-bold ${meta.color}`}>
                            {latest.healthScore}/100
                          </p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${meta.dot}`}
                              style={{ width: `${latest.healthScore}%` }}
                            />
                          </div>
                          <p className="mt-3 text-xs text-slate-500">
                            {healthRisk === "Critical" && "Immediate attention required"}
                            {healthRisk === "High"     && "Significant issues detected"}
                            {healthRisk === "Medium"   && "Some areas need improvement"}
                            {healthRisk === "Low"      && "Repository is healthy"}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Contributor Concentration Risk */}
                    {(() => {
                      const meta = RISK_META[concentrationRisk];
                      return (
                        <div className={`rounded-xl border p-5 ${meta.bg} ${meta.border}`}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400">Contributor Concentration</p>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${meta.color} ${meta.bg}`}>
                              {concentrationRisk}
                            </span>
                          </div>
                          <p className={`mt-4 text-3xl font-bold ${meta.color}`}>
                            {topContribPct.toFixed(1)}%
                          </p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${meta.dot}`}
                              style={{ width: `${Math.min(100, topContribPct)}%` }}
                            />
                          </div>
                          <p className="mt-3 text-xs text-slate-500">
                            Top contributor share · {latest.contributorCount} total contributor{latest.contributorCount !== 1 ? "s" : ""}
                          </p>
                          <p className={`mt-1 text-xs font-medium ${meta.color}`}>
                            {concentrationRisk === "Critical" && "Extreme single-contributor dependency"}
                            {concentrationRisk === "High"     && "High knowledge concentration"}
                            {concentrationRisk === "Medium"   && "Moderate concentration risk"}
                            {concentrationRisk === "Low"      && "Well-distributed contributions"}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Bus Factor Risk */}
                    {(() => {
                      const meta = RISK_META[busFactorRisk];
                      return (
                        <div className={`rounded-xl border p-5 ${meta.bg} ${meta.border}`}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400">Bus Factor</p>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${meta.color} ${meta.bg}`}>
                              {busFactorRisk}
                            </span>
                          </div>
                          <p className={`mt-4 text-3xl font-bold ${meta.color}`}>
                            {latest.estimatedBusFactor}
                          </p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${meta.dot}`}
                              style={{ width: `${Math.min(100, latest.estimatedBusFactor * 25)}%` }}
                            />
                          </div>
                          <p className="mt-3 text-xs text-slate-500">
                            Key contributors for 50% of commits
                          </p>
                          <p className={`mt-1 text-xs font-medium ${meta.color}`}>
                            {busFactorRisk === "Critical" && "1 person is a single point of failure"}
                            {busFactorRisk === "High"     && "Very few key contributors"}
                            {busFactorRisk === "Medium"   && "Moderate bus factor risk"}
                            {busFactorRisk === "Low"      && "Good contributor spread"}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Stagnant Files Risk */}
                    {(() => {
                      const meta = RISK_META[stagnantRisk];
                      const stagnantPct = latest.totalFiles > 0
                        ? ((latest.stagnantFiles / latest.totalFiles) * 100).toFixed(1)
                        : "0.0";
                      return (
                        <div className={`rounded-xl border p-5 ${meta.bg} ${meta.border}`}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400">Stagnant Files</p>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${meta.color} ${meta.bg}`}>
                              {stagnantRisk}
                            </span>
                          </div>
                          <p className={`mt-4 text-3xl font-bold ${meta.color}`}>
                            {latest.stagnantFiles}
                            <span className="ml-2 text-base font-normal text-slate-500">
                              / {latest.totalFiles}
                            </span>
                          </p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${meta.dot}`}
                              style={{ width: `${stagnantPct}%` }}
                            />
                          </div>
                          <p className="mt-3 text-xs text-slate-500">
                            {stagnantPct}% of files unchanged &gt; 30 days
                          </p>
                          <p className={`mt-1 text-xs font-medium ${meta.color}`}>
                            {stagnantRisk === "Critical" && "Majority of files are stagnant"}
                            {stagnantRisk === "High"     && "Large portion of files stagnant"}
                            {stagnantRisk === "Medium"   && "Noticeable stagnation present"}
                            {stagnantRisk === "Low"      && "Files are actively maintained"}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Risk Category Summary Table */}
                  <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
                    <div className="border-b border-slate-800 bg-slate-900/60 px-5 py-4">
                      <h4 className="text-sm font-semibold text-slate-300">Risk Category Summary</h4>
                    </div>
                    <div className="divide-y divide-slate-800">
                      {[
                        { label: "Overall Repository Health", risk: healthRisk,         value: `${latest.healthScore}/100` },
                        { label: "Contributor Concentration", risk: concentrationRisk,   value: `${topContribPct.toFixed(1)}% top contributor` },
                        { label: "Bus Factor",                risk: busFactorRisk,       value: `${latest.estimatedBusFactor} key contributor${latest.estimatedBusFactor !== 1 ? "s" : ""}` },
                        { label: "Stagnant File Rate",        risk: stagnantRisk,        value: `${latest.stagnantFiles} of ${latest.totalFiles} files` },
                      ].map((row) => {
                        const meta = RISK_META[row.risk];
                        return (
                          <div key={row.label} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                            <span className="text-sm text-slate-300">{row.label}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-slate-500">{row.value}</span>
                              <span className={`flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold ${meta.color} ${meta.bg} ${meta.border}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                {row.risk}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <p className="py-12 text-center text-slate-500">
                  {loading ? "Loading risk data..." : "No analysis data available."}
                </p>
              )}
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
                    Search, filter, sort and inspect saved repository analyses
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
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
                    {filteredHistory.length === history.length
                      ? `${history.length} records`
                      : `${filteredHistory.length} of ${history.length} filtered`}
                  </span>
                </div>
              </div>

              {/* Controls Toolbar: Search, Filter, Sort */}
              <div className="border-b border-slate-800 bg-slate-900/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                        🔍
                      </span>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by ID, date, rating..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-8 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-blue-500"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filter by Health Rating */}
                    <div className="flex items-center gap-2">
                      <label htmlFor="filter-rating" className="text-xs text-slate-400 whitespace-nowrap">
                        Rating:
                      </label>
                      <select
                        id="filter-rating"
                        value={ratingFilter}
                        onChange={(e) => setRatingFilter(e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none transition focus:border-blue-500"
                      >
                        <option value="ALL">All Ratings</option>
                        <option value="Healthy">Healthy</option>
                        <option value="Moderate">Moderate</option>
                        <option value="At Risk">At Risk</option>
                      </select>
                    </div>

                    {/* Sort Selector */}
                    <div className="flex items-center gap-2">
                      <label htmlFor="sort-by" className="text-xs text-slate-400 whitespace-nowrap">
                        Sort by:
                      </label>
                      <select
                        id="sort-by"
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(
                            e.target.value as
                              | "date-desc"
                              | "date-asc"
                              | "score-desc"
                              | "score-asc"
                          )
                        }
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none transition focus:border-blue-500"
                      >
                        <option value="date-desc">Date (Newest first)</option>
                        <option value="date-asc">Date (Oldest first)</option>
                        <option value="score-desc">Health Score (Highest)</option>
                        <option value="score-asc">Health Score (Lowest)</option>
                      </select>
                    </div>

                    {/* Reset Filters button */}
                    {(searchTerm !== "" || ratingFilter !== "ALL" || sortBy !== "date-desc") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setRatingFilter("ALL");
                          setSortBy("date-desc");
                        }}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-500 hover:text-white"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>

                  {/* Page Size Selector */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Show:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none transition focus:border-blue-500"
                    >
                      <option value={5}>5 per page</option>
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                    </select>
                  </div>
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
                      <th className="px-6 py-4 font-medium"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {/* Loading Skeleton State */}
                    {loading && (
                      <>
                        {[1, 2, 3].map((skeleton) => (
                          <tr key={skeleton} className="animate-pulse">
                            <td className="px-6 py-4">
                              <div className="h-4 w-32 rounded bg-slate-800" />
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-4 w-20 rounded bg-slate-800" />
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-4 w-12 rounded bg-slate-800" />
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-4 w-14 rounded bg-slate-800" />
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-4 w-14 rounded bg-slate-800" />
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-4 w-16 rounded bg-slate-800" />
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-4 w-16 rounded bg-slate-800" />
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-4 w-20 rounded bg-slate-800" />
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-6 w-14 rounded bg-slate-800" />
                            </td>
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Populated Data Rows */}
                    {!loading &&
                      paginatedHistory.map((item) => (
                        <tr
                          key={item.id}
                          className="cursor-pointer transition hover:bg-slate-800/40"
                          onClick={() => void openDetail(item.id)}
                        >
                          <td className="max-w-48 truncate px-6 py-4 font-mono text-xs text-blue-400">
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

                          <td className="px-6 py-4">
                            <span
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                                item.healthRating === "Healthy"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : item.healthRating === "Moderate"
                                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
                                  : "bg-red-500/10 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {item.healthRating}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openDetail(item.id);
                              }}
                              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-400 transition hover:border-blue-500 hover:text-blue-400"
                            >
                              View →
                            </button>
                          </td>
                        </tr>
                      ))}

                    {/* Empty State: 0 total records */}
                    {!loading && history.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-6 py-12 text-center"
                        >
                          <div className="mx-auto flex max-w-sm flex-col items-center">
                            <span className="text-3xl text-slate-600">◷</span>
                            <p className="mt-3 font-medium text-slate-300">
                              No saved analysis records available
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Run a repository analysis to start tracking repository health metrics over time.
                            </p>
                            <button
                              type="button"
                              onClick={() => void runAnalysis()}
                              disabled={analyzing}
                              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                            >
                              ⚙ Run Analysis Now
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Empty State: Filter yielded 0 results */}
                    {!loading && history.length > 0 && filteredHistory.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-6 py-12 text-center"
                        >
                          <div className="mx-auto flex max-w-sm flex-col items-center">
                            <span className="text-2xl text-slate-600">🔍</span>
                            <p className="mt-2 font-medium text-slate-300">
                              No matching analysis records
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              No records found matching your active search or filter criteria.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm("");
                                setRatingFilter("ALL");
                                setSortBy("date-desc");
                              }}
                              className="mt-3 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-blue-500 hover:text-blue-400"
                            >
                              Clear all filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {!loading && filteredHistory.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/30 px-6 py-4 text-xs text-slate-400">
                  <div>
                    Showing{" "}
                    <span className="font-semibold text-slate-200">
                      {(currentPage - 1) * pageSize + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-200">
                      {Math.min(currentPage * pageSize, filteredHistory.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-200">
                      {filteredHistory.length}
                    </span>{" "}
                    records
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-blue-500 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ← Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-7 w-7 rounded-lg text-xs font-medium transition ${
                            currentPage === pageNum
                              ? "bg-blue-600 text-white"
                              : "border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-blue-500 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <p className="pb-4 text-center text-xs text-slate-600">
              Repository Health Intelligence Platform · Development Version
            </p>
          </div>
        </section>
      </div>

      {/* ── Individual Analysis Detail Panel (slide-in overlay) ── */}
      {(detailPanel ?? detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setDetailPanel(null); setDetailError(""); }}
          />

          {/* Panel */}
          <div className="relative z-10 flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-[#0e1528] shadow-2xl">

            {/* Panel Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-[#0e1528] px-6 py-5">
              <div>
                <p className="text-xs text-slate-500">Analysis Details</p>
                <h2 className="mt-0.5 text-lg font-bold">
                  {detailPanel ? new Date(detailPanel.analyzedAt).toLocaleString() : "Loading..."}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* Prev / Next navigation */}
                {detailPanel && (() => {
                  const idx = history.findIndex((h) => h.id === detailPanel.id);
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => navigateDetail("prev")}
                        disabled={idx <= 0}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 transition hover:border-blue-500 hover:text-blue-400 disabled:opacity-30"
                        title="Newer analysis"
                      >
                        ← Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateDetail("next")}
                        disabled={idx >= history.length - 1}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 transition hover:border-blue-500 hover:text-blue-400 disabled:opacity-30"
                        title="Older analysis"
                      >
                        Next →
                      </button>
                    </>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => { setDetailPanel(null); setDetailError(""); }}
                  className="ml-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 transition hover:border-red-500 hover:text-red-400"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Panel Body */}
            <div className="flex-1 space-y-6 p-6">

              {detailLoading && (
                <p className="py-20 text-center text-slate-500">Loading analysis details...</p>
              )}

              {detailError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {detailError}
                </div>
              )}

              {detailPanel && !detailLoading && (
                <>
                  {/* Repository Metrics */}
                  <div className="rounded-xl border border-slate-800 bg-[#111a2e] p-5">
                    <h3 className="mb-4 text-sm font-semibold text-slate-300">Repository Metrics</h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {[
                        { label: "Total Commits",   value: detailPanel.totalCommits.toLocaleString(),    color: "text-blue-400" },
                        { label: "Active Days",      value: detailPanel.activeDays.toLocaleString(),      color: "text-purple-400" },
                        { label: "Contributors",     value: detailPanel.contributorCount.toLocaleString(), color: "text-emerald-400" },
                        { label: "Total Files",      value: detailPanel.totalFiles.toLocaleString(),      color: "text-orange-400" },
                        { label: "Lines Added",      value: detailPanel.totalAdditions.toLocaleString(),  color: "text-emerald-400" },
                        { label: "Lines Deleted",    value: detailPanel.totalDeletions.toLocaleString(),  color: "text-red-400" },
                        { label: "Code Churn",       value: detailPanel.totalChurn.toLocaleString(),      color: "text-blue-400" },
                        { label: "Bus Factor",       value: String(detailPanel.estimatedBusFactor),       color: "text-orange-400" },
                        { label: "Stagnant Files",   value: String(detailPanel.stagnantFiles),            color: "text-red-400" },
                      ].map((m) => (
                        <div key={m.label} className="rounded-lg bg-slate-900 p-3">
                          <p className="text-xs text-slate-500">{m.label}</p>
                          <p className={`mt-1.5 text-lg font-bold ${m.color}`}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Health Score Breakdown */}
                  <div className="rounded-xl border border-slate-800 bg-[#111a2e] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-300">Health Score Breakdown</h3>
                      <span className="rounded-lg bg-blue-500/10 px-3 py-1 text-sm font-bold text-blue-400">
                        {detailPanel.healthScore}/100 · {detailPanel.healthRating}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: "Activity",      value: detailPanel.scoreBreakdown.activity,      max: 25, color: "bg-purple-400" },
                        { label: "Collaboration", value: detailPanel.scoreBreakdown.collaboration, max: 25, color: "bg-blue-400" },
                        { label: "Knowledge",     value: detailPanel.scoreBreakdown.knowledge,     max: 25, color: "bg-emerald-400" },
                        { label: "Maintenance",   value: detailPanel.scoreBreakdown.maintenance,   max: 25, color: "bg-orange-400" },
                      ].map((s) => (
                        <div key={s.label}>
                          <div className="mb-1.5 flex justify-between text-xs">
                            <span className="text-slate-400">{s.label}</span>
                            <span className="font-semibold text-slate-200">{s.value}/{s.max}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${s.color}`}
                              style={{ width: `${(s.value / s.max) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contributors */}
                  {detailPanel.contributors.length > 0 && (
                    <div className="rounded-xl border border-slate-800 bg-[#111a2e] p-5">
                      <h3 className="mb-4 text-sm font-semibold text-slate-300">
                        Contributors ({detailPanel.contributors.length})
                      </h3>
                      <div className="space-y-3">
                        {detailPanel.contributors.map((c, i) => (
                          <div key={`${c.author}-${i}`} className="rounded-lg bg-slate-900 p-3">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-slate-200">{c.author}</span>
                              <span className="font-semibold text-blue-400">{c.percentage.toFixed(1)}%</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{c.commits} commits</p>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${Math.min(100, c.percentage)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Commits */}
                  {detailPanel.commits.length > 0 && (
                    <div className="rounded-xl border border-slate-800 bg-[#111a2e] p-5">
                      <h3 className="mb-4 text-sm font-semibold text-slate-300">
                        Commits ({detailPanel.commits.length})
                      </h3>
                      <div className="space-y-2">
                        {detailPanel.commits.slice(0, 20).map((c) => (
                          <div key={c.hash} className="rounded-lg bg-slate-900 p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm text-slate-200 leading-snug">{c.message}</p>
                              <span className="shrink-0 font-mono text-xs text-slate-500">{c.hash.slice(0, 7)}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                              <span>{c.authorName}</span>
                              <span>{new Date(c.date).toLocaleDateString()}</span>
                              <span className="text-emerald-400">+{c.additions}</span>
                              <span className="text-red-400">-{c.deletions}</span>
                            </div>
                          </div>
                        ))}
                        {detailPanel.commits.length > 20 && (
                          <p className="pt-1 text-center text-xs text-slate-600">
                            Showing 20 of {detailPanel.commits.length} commits
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
