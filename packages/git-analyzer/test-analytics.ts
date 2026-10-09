
import {
  getRankedContributors,
  getContributorPercentages,
  getContributorCount,
  getCommitsByAuthor
} from "./src/analytics.js";

import type { Commit } from "./src/types.js";

const commits: Commit[] = [];

console.log("Ranked contributors:", getRankedContributors(commits));
console.log("Contributor percentages:", getContributorPercentages(commits));
console.log("Contributor count:", getContributorCount(commits));
console.log("Commits by author:", getCommitsByAuthor(commits));
