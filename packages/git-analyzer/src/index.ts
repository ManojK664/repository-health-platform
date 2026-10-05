import { execFile } from "node:child_process";
import type { Commit } from "./types.js";

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

    console.log("\nTotal commits:", commits.length);

    console.log("\nCommit messages:");

    commits.forEach((commit) => {
      console.log("-", commit.message);
    });

    const authorCounts: Record<string, number> = {};

    commits.forEach((commit) => {
      authorCounts[commit.authorName] =
        (authorCounts[commit.authorName] || 0) + 1;
    });

    console.log("\nCommits by author:");
    console.log(authorCounts);

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