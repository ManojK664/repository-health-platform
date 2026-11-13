import { Router } from "express";
import path from "node:path";

import { prisma } from "./lib/prisma.js";

import { getRepositoryCommits } from "../../../packages/git-analyzer/src/repository-analyzer.js";
import {
  validateGitHubUrl,
  cloneGitHubRepository,
} from "../../../packages/git-analyzer/src/git-clone.js";

import {
  getTotalCommits,
  getActiveDays,
  getContributorCount,
  getRankedContributors,
  getTotalAdditions,
  getTotalDeletions,
  getTotalChurn,
  getFileHotspots,
  getFileStagnation,
  getFileOwnership,
} from "../../../packages/git-analyzer/src/analytics.js";

import { calculateHealthScore } from "../../../packages/scoring-engine/src/health-score.js";

const router = Router();

/**
 * Shared core function that processes Git commits from a directory,
 * computes health and maintainability metrics, and persists them into PostgreSQL.
 */
async function analyzeAndSaveRepository(
  repoPath: string,
  repoName: string,
  repoIdentifier: string
) {
  // 1. Analyze the Git repository
  const commits = await getRepositoryCommits(repoPath, 100);

  if (commits.length === 0) {
    throw new Error(
      "No commits found in repository. Ensure the repository has at least one commit."
    );
  }

  // 2. Calculate basic repository metrics
  const totalCommits = getTotalCommits(commits);
  const activeDays = getActiveDays(commits);
  const contributorCount = getContributorCount(commits);

  // 3. Calculate contributor analytics
  const rankedContributors = getRankedContributors(commits);
  const rawTopPercentage = rankedContributors[0]?.percentage ?? 0;
  const minPossible = contributorCount > 0 ? 100 / contributorCount : 0;
  const topContributorPercentage = Math.max(rawTopPercentage, minPossible);

  // 4. Calculate repository-wide bus factor
  let estimatedBusFactor = 0;
  let accumulatedCommits = 0;

  for (const contributor of rankedContributors) {
    accumulatedCommits += contributor.commits;
    estimatedBusFactor++;

    if (accumulatedCommits >= totalCommits / 2) {
      break;
    }
  }

  // 5. Calculate code change metrics
  const totalAdditions = getTotalAdditions(commits);
  const totalDeletions = getTotalDeletions(commits);
  const totalChurn = getTotalChurn(commits);

  // 6. Calculate file analytics
  const hotspots = getFileHotspots(commits);
  const stagnation = getFileStagnation(commits);
  const ownership = getFileOwnership(commits);
  const totalFiles = hotspots.length;

  // Project-defined heuristic: unchanged for more than 30 days
  const stagnantFiles = stagnation.filter(
    (file) => file.daysSinceLastChange > 30
  ).length;

  // 7. Calculate repository health score
  const healthScore = calculateHealthScore({
    activeDays,
    contributorCount,
    topContributorPercentage,
    estimatedBusFactor,
    totalFiles,
    stagnantFiles,
  });

  // 8. Save or update repository information
  const repository = await prisma.repository.upsert({
    where: {
      path: repoIdentifier,
    },
    update: {
      name: repoName,
      updatedAt: new Date(),
    },
    create: {
      name: repoName,
      path: repoIdentifier,
    },
  });

  // 9. Save analysis, contributors and commits
  const savedAnalysis = await prisma.analysis.create({
    data: {
      repositoryId: repository.id,
      totalCommits,
      activeDays,
      contributorCount,
      totalFiles,
      totalAdditions,
      totalDeletions,
      totalChurn,
      estimatedBusFactor,
      stagnantFiles,
      healthScore: healthScore.score,
      healthRating: healthScore.rating,
      scoreBreakdown: healthScore.breakdown,
      contributors: {
        create: rankedContributors.map((contributor) => ({
          author: contributor.author,
          commits: contributor.commits,
          percentage: contributor.percentage,
        })),
      },
      commits: {
        create: commits.map((commit) => {
          const additions = commit.files.reduce(
            (sum, file) => sum + file.additions,
            0
          );
          const deletions = commit.files.reduce(
            (sum, file) => sum + file.deletions,
            0
          );

          return {
            hash: commit.hash,
            authorName: commit.authorName,
            authorEmail: commit.authorEmail,
            date: new Date(commit.date),
            message: commit.message,
            additions,
            deletions,
            churn: additions + deletions,
          };
        }),
      },
    },
  });

  return {
    savedAnalysis,
    repository,
    totalCommits,
    activeDays,
    contributorCount,
    totalFiles,
    totalAdditions,
    totalDeletions,
    totalChurn,
    rankedContributors,
    hotspots,
    stagnation,
    ownership,
    estimatedBusFactor,
    stagnantFiles,
    healthScore,
  };
}

/**
 * Common handler for both POST and GET analysis requests.
 * Supports public GitHub URLs and fallback to local repository.
 */
async function handleAnalysisRequest(
  urlInput: string | undefined,
  res: any
) {
  let isRemote = false;
  let cleanupCloned: (() => Promise<void>) | null = null;

  try {
    let repoPath: string;
    let repoName: string;
    let repoIdentifier: string;

    const trimmedUrl = urlInput ? String(urlInput).trim() : "";

    if (trimmedUrl && trimmedUrl.toLowerCase() !== "local") {
      isRemote = true;

      // 1. Validate GitHub URL
      const validation = validateGitHubUrl(trimmedUrl);
      if (!validation.valid || !validation.normalizedUrl || !validation.fullName) {
        return res.status(400).json({
          success: false,
          message: validation.error ?? "Invalid GitHub URL.",
        });
      }

      // 2. Clone repository into secure isolated temporary directory
      const cloned = await cloneGitHubRepository(validation.normalizedUrl, {
        depth: 100,
        timeoutMs: 60000,
      });

      repoPath = cloned.tempDir;
      repoName = cloned.fullName;
      repoIdentifier = cloned.normalizedUrl;
      cleanupCloned = cloned.cleanup;
    } else {
      // Local repository fallback
      repoPath = process.cwd();
      repoName = path.basename(repoPath);
      repoIdentifier = repoPath;
    }

    // 3. Analyze and persist in PostgreSQL
    const result = await analyzeAndSaveRepository(
      repoPath,
      repoName,
      repoIdentifier
    );

    return res.status(200).json({
      success: true,
      analysisId: result.savedAnalysis.id,
      repository: result.repository.name,
      repositoryPath: result.repository.path,
      repositoryId: result.repository.id,
      isRemote,
      summary: {
        totalCommits: result.totalCommits,
        activeDays: result.activeDays,
        contributorCount: result.contributorCount,
        totalFiles: result.totalFiles,
      },
      codeChanges: {
        totalAdditions: result.totalAdditions,
        totalDeletions: result.totalDeletions,
        totalChurn: result.totalChurn,
      },
      contributors: result.rankedContributors,
      hotspots: result.hotspots.slice(0, 10),
      stagnation: result.stagnation.slice(0, 10),
      ownership: result.ownership.slice(0, 10),
      estimatedBusFactor: result.estimatedBusFactor,
      stagnantFiles: result.stagnantFiles,
      healthScore: result.healthScore,
    });
  } catch (error) {
    console.error("Repository analysis failed:", error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to analyze repository.",
    });
  } finally {
    if (cleanupCloned) {
      await cleanupCloned();
    }
  }
}

// POST /api/repository/analyze
router.post("/analyze", async (req, res) => {
  const url = req.body?.url ?? req.query?.url;
  return handleAnalysisRequest(url, res);
});

// GET /api/repository/analyze
router.get("/analyze", async (req, res) => {
  const url = req.query?.url as string | undefined;
  return handleAnalysisRequest(url, res);
});

// GET /api/repository/list
router.get("/list", async (_req, res) => {
  try {
    const repositories = await prisma.repository.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        analyses: {
          orderBy: {
            analyzedAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            analyzedAt: true,
            healthScore: true,
            healthRating: true,
            totalCommits: true,
            contributorCount: true,
          },
        },
        _count: {
          select: {
            analyses: true,
          },
        },
      },
    });

    const formatted = repositories.map((repo) => ({
      id: repo.id,
      name: repo.name,
      path: repo.path,
      isRemote: repo.path.startsWith("http://") || repo.path.startsWith("https://"),
      analysisCount: repo._count.analyses,
      lastAnalyzedAt: repo.analyses[0]?.analyzedAt ?? repo.updatedAt,
      latestAnalysis: repo.analyses[0] ?? null,
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      repositories: formatted,
    });
  } catch (error) {
    console.error("Failed to list repositories:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve repository list.",
    });
  }
});

// GET /api/repository/history
router.get("/history", async (req, res) => {
  try {
    const repositoryId = req.query.repositoryId as string | undefined;
    const url = req.query.url as string | undefined;

    let whereClause: any = {};
    if (repositoryId) {
      whereClause.repositoryId = repositoryId;
    } else if (url) {
      const validation = validateGitHubUrl(url);
      const targetPath = validation.valid ? validation.normalizedUrl : url;
      whereClause.repository = {
        path: targetPath,
      };
    }

    const history = await prisma.analysis.findMany({
      where: whereClause,
      orderBy: {
        analyzedAt: "desc",
      },
      select: {
        id: true,
        repositoryId: true,
        analyzedAt: true,
        totalCommits: true,
        activeDays: true,
        contributorCount: true,
        totalFiles: true,
        totalAdditions: true,
        totalDeletions: true,
        totalChurn: true,
        estimatedBusFactor: true,
        stagnantFiles: true,
        healthScore: true,
        healthRating: true,
        repository: {
          select: {
            id: true,
            name: true,
            path: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error("Failed to retrieve analysis history:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve analysis history.",
    });
  }
});

// GET /api/repository/history/:id
router.get("/history/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await prisma.analysis.findUnique({
      where: {
        id,
      },
      include: {
        contributors: {
          orderBy: {
            commits: "desc",
          },
        },
        commits: {
          orderBy: {
            date: "desc",
          },
        },
        repository: true,
      },
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Analysis not found",
      });
    }

    return res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Failed to retrieve analysis:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve analysis details",
    });
  }
});

export default router;
