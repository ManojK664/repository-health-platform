import { execFile } from "node:child_process";

execFile(
  "git",
  ["log", "--format=%H|%an|%ae|%aI|%s", "-10"],
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

    const commits = lines.map((line) => {
      const [
        hash,
        authorName,
        authorEmail,
        date,
        message
      ] = line.split("|");

      return {
        hash,
        authorName,
        authorEmail,
        date,
        message
      };
    });

    console.log("Repository commits:");
    console.dir(commits, { depth: null });
  }
);