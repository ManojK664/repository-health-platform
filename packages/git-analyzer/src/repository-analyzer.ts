
import { execFile } from "node:child_process";
import type { Commit } from "./types.js";

export function getRepositoryCommits(
  repositoryPath: string,
  limit: number = 100
): Promise<Commit[]> {
  return new Promise((resolve, reject) => {
    // Validate commit limit
    if (!Number.isInteger(limit) || limit < 1) {
      reject(
        new Error("Commit limit must be a positive integer.")
      );
      return;
    }

    // Execute Git log inside the requested repository
    execFile(
      "git",
      [
        "log",
        "--numstat",
        "--format=COMMIT:%H|%an|%ae|%aI|%s",
        `-${limit}`,
      ],
      {
        cwd: repositoryPath,
        maxBuffer: 10 * 1024 * 1024,
        encoding: "utf8",
      },
      (error, stdout) => {
        if (error) {
          reject(
            new Error(
              `Unable to analyze repository: ${error.message}`
            )
          );
          return;
        }

        const commits: Commit[] = [];

        let currentCommit: Commit | null = null;

        // Parse Git log output
        for (const line of stdout.split(/\r?\n/)) {
          if (line.startsWith("COMMIT:")) {
            const commitData = line.substring(
              "COMMIT:".length
            );

            const [
              hash,
              authorName,
              authorEmail,
              date,
              ...messageParts
            ] = commitData.split("|");

            if (
              !hash ||
              !authorName ||
              !authorEmail ||
              !date
            ) {
              currentCommit = null;
              continue;
            }

            currentCommit = {
              hash,
              authorName,
              authorEmail,
              date,
              message: messageParts.join("|"),
              files: [],
            };

            commits.push(currentCommit);
          } else if (currentCommit && line.trim()) {
            const parts = line.trim().split(/\s+/);

            if (parts.length >= 3) {
              const additions =
                parts[0] === "-"
                  ? 0
                  : Number(parts[0]);

              const deletions =
                parts[1] === "-"
                  ? 0
                  : Number(parts[1]);

              const path = parts.slice(2).join(" ");

              if (
                Number.isFinite(additions) &&
                Number.isFinite(deletions)
              ) {
                currentCommit.files.push({
                  path,
                  additions,
                  deletions,
                });
              }
            }
          }
        }

        resolve(commits);
      }
    );
  });
}
