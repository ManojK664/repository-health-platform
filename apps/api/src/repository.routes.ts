
import { Router } from "express";
import path from "node:path";

import { prisma } from "./lib/prisma.js";

import { getRepositoryCommits } from "../../../packages/git-analyzer/src/repository-analyzer.js";

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

// GET /api/repository/analyze
router.get("/analyze", async (_req, res) => {
  try {
    // 1. Analyze the current Git repository
    const repositoryPath = process.cwd();

    const commits = await getRepositoryCommits(
      repositoryPath,
      100
    );

    // 2. Calculate basic repository metrics
    const totalCommits = getTotalCommits(commits);
    const activeDays = getActiveDays(commits);
    const contributorCount = getContributorCount(commits);

    // 3. Calculate contributor analytics
    const rankedContributors = getRankedContributors(commits);

    const topContributorPercentage =
      rankedContributors[0]?.percentage ?? 0;

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
    const repositoryName = path.basename(repositoryPath);

    const repository = await prisma.repository.upsert({
      where: {
        path: repositoryPath,
      },
      update: {
        name: repositoryName,
      },
      create: {
        name: repositoryName,
        path: repositoryPath,
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

    // 10. Return the analysis response
    res.status(200).json({
      success: true,

      analysisId: savedAnalysis.id,

      repository: repositoryPath,

      summary: {
        totalCommits,
        activeDays,
        contributorCount,
        totalFiles,
      },

      codeChanges: {
        totalAdditions,
        totalDeletions,
        totalChurn,
      },

      contributors: rankedContributors,

      hotspots: hotspots.slice(0, 10),

      stagnation: stagnation.slice(0, 10),

      ownership: ownership.slice(0, 10),

      estimatedBusFactor,

      stagnantFiles,

      healthScore,
    });
  } catch (error) {
    console.error("Repository analysis failed:", error);

    res.status(500).json({
      success: false,
      message: "Unable to analyze repository",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });
  }
});

export default router;
