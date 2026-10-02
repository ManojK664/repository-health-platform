import { execFile } from "node:child_process";

execFile(
  "git",
  ["log", "--oneline", "-10"],
  (error, stdout, stderr) => {
    if (error) {
      console.error("Git command failed:");
      console.error(error.message);
      return;
    }

    if (stderr) {
      console.error(stderr);
    }

    console.log("Recent commits:");
    console.log(stdout);
  }
);