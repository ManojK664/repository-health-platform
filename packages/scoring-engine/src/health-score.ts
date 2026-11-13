
export interface HealthScoreInput {
  activeDays: number;
  contributorCount: number;
  topContributorPercentage: number;
  estimatedBusFactor: number;
  totalFiles: number;
  stagnantFiles: number;
}

export interface HealthScoreBreakdown {
  activity: number;
  collaboration: number;
  knowledge: number;
  maintenance: number;
}

export interface HealthScoreResult {
  score: number;
  rating: "Healthy" | "Moderate" | "At Risk";
  breakdown: HealthScoreBreakdown;
}

// Activity score: Maximum 25
export function calculateActivityScore(activeDays: number): number {
  if (!Number.isFinite(activeDays) || activeDays < 0) {
    throw new Error("Invalid active days.");
  }

  return Math.min(25, activeDays * 2.5);
}

// Collaboration score: Maximum 25
export function calculateCollaborationScore(
  contributorCount: number,
  topContributorPercentage: number
): number {
  if (
    !Number.isInteger(contributorCount) ||
    contributorCount < 0 ||
    !Number.isFinite(topContributorPercentage) ||
    topContributorPercentage < 0 ||
    topContributorPercentage > 100
  ) {
    throw new Error("Invalid collaboration metrics.");
  }

  if (contributorCount === 0) {
    if (topContributorPercentage !== 0) {
      throw new Error("Invalid contributor percentage.");
    }
    return 0;
  }

  if (
    topContributorPercentage > 0 &&
    topContributorPercentage < (100 / contributorCount) - 0.05
  ) {
    throw new Error("Invalid contributor percentage.");
  }

  let score = Math.min(
    25,
    10 + (contributorCount - 1) * 7.5
  );

  if (topContributorPercentage >= 80) {
    score -= 10;
  } else if (topContributorPercentage >= 60) {
    score -= 5;
  }

  return Math.max(0, score);
}

// Knowledge score: Maximum 25
export function calculateKnowledgeScore(
  estimatedBusFactor: number
): number {
  if (
    !Number.isInteger(estimatedBusFactor) ||
    estimatedBusFactor < 0
  ) {
    throw new Error("Invalid bus factor.");
  }

  if (estimatedBusFactor === 0) return 0;
  if (estimatedBusFactor === 1) return 8;
  if (estimatedBusFactor === 2) return 18;

  return 25;
}

// Maintenance score: Maximum 25
export function calculateMaintenanceScore(
  totalFiles: number,
  stagnantFiles: number
): number {
  if (
    !Number.isInteger(totalFiles) ||
    !Number.isInteger(stagnantFiles) ||
    totalFiles < 0 ||
    stagnantFiles < 0 ||
    stagnantFiles > totalFiles
  ) {
    throw new Error("Invalid maintenance metrics.");
  }

  if (totalFiles === 0) return 0;

  const percentage = (stagnantFiles / totalFiles) * 100;

  if (percentage > 50) return 8;
  if (percentage > 25) return 15;
  if (percentage > 10) return 20;

  return 25;
}

// Complete repository health score
export function calculateHealthScore(
  input: HealthScoreInput
): HealthScoreResult {
  if (
    !input ||
    !Number.isInteger(input.activeDays) ||
    !Number.isInteger(input.contributorCount) ||
    !Number.isFinite(input.topContributorPercentage) ||
    !Number.isInteger(input.estimatedBusFactor) ||
    !Number.isInteger(input.totalFiles) ||
    !Number.isInteger(input.stagnantFiles)
  ) {
    throw new Error("Invalid repository health metrics.");
  }

  if (
    input.activeDays < 0 ||
    input.contributorCount < 0 ||
    input.estimatedBusFactor < 0 ||
    input.totalFiles < 0 ||
    input.stagnantFiles < 0 ||
    input.stagnantFiles > input.totalFiles
  ) {
    throw new Error("Invalid repository health metrics.");
  }

  if (
    input.activeDays === 0 ||
    input.contributorCount === 0
  ) {
    if (
      input.contributorCount === 0 &&
      input.topContributorPercentage !== 0
    ) {
      throw new Error("Invalid contributor percentage.");
    }

    return {
      score: 0,
      rating: "At Risk",
      breakdown: {
        activity: 0,
        collaboration: 0,
        knowledge: 0,
        maintenance: 0,
      },
    };
  }

  const activity = calculateActivityScore(input.activeDays);

  const collaboration = calculateCollaborationScore(
    input.contributorCount,
    input.topContributorPercentage
  );

  const knowledge = calculateKnowledgeScore(
    input.estimatedBusFactor
  );

  const maintenance = calculateMaintenanceScore(
    input.totalFiles,
    input.stagnantFiles
  );

  const score = Math.round(
    activity + collaboration + knowledge + maintenance
  );

  const rating: HealthScoreResult["rating"] =
    score >= 75
      ? "Healthy"
      : score >= 50
        ? "Moderate"
        : "At Risk";

  return {
    score,
    rating,
    breakdown: {
      activity,
      collaboration,
      knowledge,
      maintenance,
    },
  };
}
