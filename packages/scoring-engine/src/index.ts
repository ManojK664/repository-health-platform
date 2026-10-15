
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

// 1. Activity Score: Maximum 25 points
export function calculateActivityScore(activeDays: number): number {
  if (!Number.isFinite(activeDays) || activeDays < 0) {
    throw new Error("Active days must be a non-negative number.");
  }

  return Math.min(25, activeDays * 2.5);
}

// 2. Collaboration Score: Maximum 25 points
export function calculateCollaborationScore(
  contributorCount: number,
  topContributorPercentage: number
): number {
  if (
    !Number.isFinite(contributorCount) ||
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
      throw new Error(
        "Top contributor percentage must be 0 when there are no contributors."
      );
    }
    return 0;
  }

  if (topContributorPercentage > 0 && topContributorPercentage < 100 / contributorCount) {
    throw new Error(
      "Top contributor percentage cannot be below an equal share."
    );
  }

  let score = Math.min(25, 10 + (contributorCount - 1) * 7.5);

  if (topContributorPercentage >= 80) {
    score -= 10;
  } else if (topContributorPercentage >= 60) {
    score -= 5;
  }

  return Math.max(0, score);
}

// 3. Knowledge Distribution Score: Maximum 25 points
export function calculateKnowledgeScore(
  estimatedBusFactor: number
): number {
  if (
    !Number.isFinite(estimatedBusFactor) ||
    !Number.isInteger(estimatedBusFactor) ||
    estimatedBusFactor < 0
  ) {
    throw new Error("Estimated bus factor must be a non-negative integer.");
  }

  if (estimatedBusFactor === 0) return 0;
  if (estimatedBusFactor === 1) return 8;
  if (estimatedBusFactor === 2) return 18;

  return 25;
}

// 4. Maintenance Score: Maximum 25 points
export function calculateMaintenanceScore(
  totalFiles: number,
  stagnantFiles: number
): number {
  if (
    !Number.isFinite(totalFiles) ||
    !Number.isInteger(totalFiles) ||
    totalFiles < 0 ||
    !Number.isFinite(stagnantFiles) ||
    !Number.isInteger(stagnantFiles) ||
    stagnantFiles < 0 ||
    stagnantFiles > totalFiles
  ) {
    throw new Error("Invalid file maintenance metrics.");
  }

  if (totalFiles === 0) return 0;

  const stagnantPercentage = (stagnantFiles / totalFiles) * 100;

  if (stagnantPercentage > 50) return 8;
  if (stagnantPercentage > 25) return 15;
  if (stagnantPercentage > 10) return 20;

  return 25;
}

// 5. Complete Repository Health Score
export function calculateHealthScore(
  input: HealthScoreInput
): HealthScoreResult {
  if (
    input === null ||
    typeof input !== "object" ||
    !Number.isFinite(input.activeDays) ||
    !Number.isInteger(input.activeDays) ||
    !Number.isFinite(input.contributorCount) ||
    !Number.isInteger(input.contributorCount) ||
    !Number.isFinite(input.topContributorPercentage) ||
    !Number.isFinite(input.estimatedBusFactor) ||
    !Number.isFinite(input.totalFiles) ||
    !Number.isFinite(input.stagnantFiles)
  ) {
    throw new Error("Invalid repository health metrics.");
  }

  if (
    input.activeDays < 0 ||
    input.contributorCount < 0 ||
    input.topContributorPercentage < 0 ||
    input.topContributorPercentage > 100 ||
    input.estimatedBusFactor < 0 ||
    !Number.isInteger(input.estimatedBusFactor) ||
    input.totalFiles < 0 ||
    !Number.isInteger(input.totalFiles) ||
    input.stagnantFiles < 0 ||
    !Number.isInteger(input.stagnantFiles) ||
    input.stagnantFiles > input.totalFiles
  ) {
    throw new Error("Invalid repository health metrics.");
  }

  if (
    input.contributorCount === 0 &&
    input.topContributorPercentage !== 0
  ) {
    throw new Error(
      "Top contributor percentage must be 0 when there are no contributors."
    );
  }

  if (
    input.activeDays === 0 ||
    input.contributorCount === 0
  ) {
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

  let rating: HealthScoreResult["rating"];

  if (score >= 75) {
    rating = "Healthy";
  } else if (score >= 50) {
    rating = "Moderate";
  } else {
    rating = "At Risk";
  }

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

// -------------------------
// TESTS
// -------------------------

console.log("\n===== ACTIVITY SCORE TESTS =====");
console.log("0 active days:", calculateActivityScore(0));   // 0
console.log("2 active days:", calculateActivityScore(2));   // 5
console.log("5 active days:", calculateActivityScore(5));   // 12.5
console.log("10 active days:", calculateActivityScore(10)); // 25

console.log("\n===== COLLABORATION SCORE TESTS =====");
console.log(
  "No contributors:",
  calculateCollaborationScore(0, 0)
); // 0

console.log(
  "One contributor:",
  calculateCollaborationScore(1, 100)
); // 0

console.log(
  "Two balanced contributors:",
  calculateCollaborationScore(2, 50)
); // 17.5

console.log(
  "Four balanced contributors:",
  calculateCollaborationScore(4, 25)
); // 25

console.log("\n===== KNOWLEDGE SCORE TESTS =====");
console.log("Bus factor 0:", calculateKnowledgeScore(0)); // 0
console.log("Bus factor 1:", calculateKnowledgeScore(1)); // 8
console.log("Bus factor 2:", calculateKnowledgeScore(2)); // 18
console.log("Bus factor 3:", calculateKnowledgeScore(3)); // 25

console.log("\n===== MAINTENANCE SCORE TESTS =====");
console.log(
  "0 stagnant out of 20:",
  calculateMaintenanceScore(20, 0)
); // 25

console.log(
  "4 stagnant out of 20:",
  calculateMaintenanceScore(20, 4)
); // 20

console.log(
  "8 stagnant out of 20:",
  calculateMaintenanceScore(20, 8)
); // 15

console.log(
  "12 stagnant out of 20:",
  calculateMaintenanceScore(20, 12)
); // 8

console.log(
  "No files:",
  calculateMaintenanceScore(0, 0)
); // 0

console.log("\n===== COMPLETE HEALTH SCORE TEST =====");

const sampleRepository: HealthScoreInput = {
  activeDays: 8,
  contributorCount: 3,
  topContributorPercentage: 50,
  estimatedBusFactor: 2,
  totalFiles: 20,
  stagnantFiles: 4,
};

console.log(calculateHealthScore(sampleRepository));

console.log("\n===== EMPTY REPOSITORY TEST =====");

const emptyRepository: HealthScoreInput = {
  activeDays: 0,
  contributorCount: 0,
  topContributorPercentage: 0,
  estimatedBusFactor: 0,
  totalFiles: 0,
  stagnantFiles: 0,
};

console.log(calculateHealthScore(emptyRepository));

console.log("\n===== INPUT VALIDATION TEST =====");

try {
  calculateHealthScore({
    activeDays: -1,
    contributorCount: 2,
    topContributorPercentage: 50,
    estimatedBusFactor: 2,
    totalFiles: 20,
    stagnantFiles: 4,
  });
} catch (error) {
  console.log(
    "Invalid input correctly rejected:",
    error instanceof Error ? error.message : error
  );
}
