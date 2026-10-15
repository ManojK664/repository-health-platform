
import {
  getRankedContributors,
  getContributorPercentages,
  getContributorCount,
  getCommitsByAuthor,
  getTotalAdditions,
  getTotalDeletions,
  getTotalChurn,
  getChurnByFile
} from "./src/analytics.js";

import type { Commit } from "./src/types.js";

const commits: Commit[] = [];

console.log("Ranked contributors:", getRankedContributors(commits));
console.log("Contributor percentages:", getContributorPercentages(commits));
console.log("Contributor count:", getContributorCount(commits));
console.log("Commits by author:", getCommitsByAuthor(commits));



const sampleCommits: Commit[] = [
  {
    hash: "abc123",
    authorName: "Manoj",
    authorEmail: "manoj@example.com",
    date: "2026-10-15T10:00:00+05:30",
    message: "test commit",
    files: [
      {
        path: "src/app.ts",
        additions: 10,
        deletions: 3
      },
      {
        path: "src/utils.ts",
        additions: 5,
        deletions: 2
      }
    ]
  }
];

console.log("\nCode Churn Tests:");
console.log("Test additions:", getTotalAdditions(sampleCommits));
console.log("Test deletions:", getTotalDeletions(sampleCommits));
console.log("Test churn:", getTotalChurn(sampleCommits));
console.table(getChurnByFile(sampleCommits));
