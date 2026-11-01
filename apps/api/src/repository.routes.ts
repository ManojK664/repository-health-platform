
import { Router } from "express";

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
    // Analyze the current Git repository
    const commits = await getRepositoryCommits(process.cwd(), 100);

    // Basic repository metrics
    const totalCommits = getTotalCommits(commits);
    const activeDays = getActiveDays(commits);
    const contributorCount = getContributorCount(commits);

    // Contributor analytics
    const rankedContributors = getRankedContributors(commits);

    const topContributorPercentage =
      rankedContributors[0]?.percentage ?? 0;

    // Calculate repository-wide bus factor from contributor commits
    let estimatedBusFactor = 0;
    let accumulatedCommits = 0;

    for (const contributor of rankedContributors) {
      accumulatedCommits += contributor.commits;
      estimatedBusFactor++;

      if (accumulatedCommits >= totalCommits / 2) {
        break;
      }
    }

    // Code change metrics
    const totalAdditions = getTotalAdditions(commits);
    const totalDeletions = getTotalDeletions(commits);
    const totalChurn = getTotalChurn(commits);

    // File analytics
    const hotspots = getFileHotspots(commits);
    const stagnation = getFileStagnation(commits);
    const ownership = getFileOwnership(commits);

    const totalFiles = hotspots.length;

    // Project-defined heuristic: unchanged for more than 30 days
    const stagnantFiles = stagnation.filter(
      (file) => file.daysSinceLastChange > 30
    ).length;

    // Calculate overall repository health
    const healthScore = calculateHealthScore({
      activeDays,
      contributorCount,
      topContributorPercentage,
      estimatedBusFactor,
      totalFiles,
      stagnantFiles,
    });

    // Return analysis as JSON
    res.status(200).json({
      success: true,
      repository: process.cwd(),
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
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
