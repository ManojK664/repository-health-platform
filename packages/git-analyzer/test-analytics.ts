
import {
  getRankedContributors,
  getContributorPercentages,
  getContributorCount,
  getCommitsByAuthor,
  getTotalAdditions,
  getTotalDeletions,
  getTotalChurn,
  getChurnByFile,
  getFileOwnership
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



import {
  getFileHotspots,
  getFileStagnation
} from "./src/analytics.js";

const day6Commits: Commit[] = [
  {
    hash: "commit1",
    authorName: "Manoj",
    authorEmail: "manoj@example.com",
    date: "2026-10-10T10:00:00+05:30",
    message: "first change",
    files: [
      {
        path: "src/app.ts",
        additions: 10,
        deletions: 2
      },
      {
        path: "src/utils.ts",
        additions: 5,
        deletions: 1
      }
    ]
  },
  {
    hash: "commit2",
    authorName: "Manoj",
    authorEmail: "manoj@example.com",
    date: "2026-10-12T10:00:00+05:30",
    message: "second change",
    files: [
      {
        path: "src/app.ts",
        additions: 3,
        deletions: 1
      }
    ]
  }
];

console.log("\nDay 6 Hotspot Test:");
console.table(getFileHotspots(day6Commits));

console.log("\nDay 6 Stagnation Test:");
console.table(
  getFileStagnation(
    day6Commits,
    new Date("2026-10-15T10:00:00+05:30")
  )
);



const day7Commits: Commit[] = [
  {
    hash: "commit1",
    authorName: "Manoj",
    authorEmail: "manoj@example.com",
    date: "2026-10-10T10:00:00+05:30",
    message: "update app",
    files: [
      {
        path: "src/app.ts",
        additions: 10,
        deletions: 2
      }
    ]
  },
  {
    hash: "commit2",
    authorName: "Manoj",
    authorEmail: "manoj@example.com",
    date: "2026-10-11T10:00:00+05:30",
    message: "fix app",
    files: [
      {
        path: "src/app.ts",
        additions: 4,
        deletions: 1
      }
    ]
  },
  {
    hash: "commit3",
    authorName: "Alex",
    authorEmail: "alex@example.com",
    date: "2026-10-12T10:00:00+05:30",
    message: "update app",
    files: [
      {
        path: "src/app.ts",
        additions: 3,
        deletions: 0
      }
    ]
  },
  {
    hash: "commit4",
    authorName: "Alex",
    authorEmail: "alex@example.com",
    date: "2026-10-13T10:00:00+05:30",
    message: "update utils",
    files: [
      {
        path: "src/utils.ts",
        additions: 5,
        deletions: 1
      }
    ]
  }
];

console.log("\nDay 7 Ownership Test:");
console.dir(getFileOwnership(day7Commits), { depth: null });
