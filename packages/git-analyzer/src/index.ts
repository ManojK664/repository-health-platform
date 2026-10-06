import { execFile } from "node:child_process";
import type { Commit } from "./types.js";
import {
  getTotalCommits,
  getActiveDays,
  getAverageCommitsPerActiveDay,
  getCommitsByAuthor,
  getContributorCount,
  getContributorPercentages
} from "./analytics.js";

execFile(
  "git",
  ["log", "--numstat", "--format=COMMIT:%H|%an|%ae|%aI|%s", "-10"],
  (error, stdout, stderr) => {
    if (error) {
      console.error("Git command failed:");
      console.error(error.message);
      return;
    }

    if (stderr) {
      console.error("Git error:");
      console.error(stderr);
      return;
    }

    const lines = stdout.trim().split("\n");

    const commits: Commit[] = [];

    let currentCommit: Commit | null = null;

    for (const line of lines) {
      if (line.startsWith("COMMIT:")) {
        const commitData = line.substring("COMMIT:".length);

        const [
          hash,
          authorName,
          authorEmail,
          date,
          message
        ] = commitData.split("|");

        currentCommit = {
          hash,
          authorName,
          authorEmail,
          date,
          message,
          files: []
        };

        commits.push(currentCommit);
      } else if (currentCommit && line.trim()) {
        const parts = line.trim().split(/\s+/);

        if (parts.length >= 3) {
          const additions = parts[0] === "-" ? 0 : Number(parts[0]);
          const deletions = parts[1] === "-" ? 0 : Number(parts[1]);
          const path = parts.slice(2).join(" ");

          currentCommit.files.push({
            path,
            additions,
            deletions
          });
        }
      }
    }

    console.log("Repository commits:");
    console.dir(commits, { depth: null });

    console.log("\nTotal commits:", getTotalCommits(commits));
    console.log("Active days:", getActiveDays(commits));

    console.log(
      "Average commits per active day:",
      getAverageCommitsPerActiveDay(commits).toFixed(2)
    );

    console.log("\nCommit messages:");

    commits.forEach((commit) => {
      console.log("-", commit.message);
    });


    console.log("\nCommits by author:");
    console.log(getCommitsByAuthor(commits));

    console.log(
      "Total contributors:",
      getContributorCount(commits)
    );
    console.log(
      "Contributor percentages:",
      getContributorPercentages(commits)
    );

    console.log("\nFile changes:");

    commits.forEach((commit) => {
      console.log(`\nCommit: ${commit.hash}`);

      commit.files.forEach((file) => {
        console.log(
          `  ${file.path} (+${file.additions}/-${file.deletions})`
        );
      });
    });
  }
);