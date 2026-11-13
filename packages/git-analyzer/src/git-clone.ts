import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

export interface GitHubUrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  owner?: string;
  repo?: string;
  fullName?: string;
  error?: string;
}

/**
 * Validates a GitHub repository URL and extracts owner and repository names.
 * Rejects command injection attempts, non-GitHub hosts, invalid paths, and flag prefixes.
 */
export function validateGitHubUrl(rawUrl: string): GitHubUrlValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "Repository URL is required." };
  }

  const trimmed = rawUrl.trim();

  // Guard against command injection and shell metacharacters
  if (/[\s;`$|&><\r\n"'\\]/.test(trimmed)) {
    return {
      valid: false,
      error: "URL contains invalid or unsafe characters.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: "Invalid URL format. Please provide a full URL (e.g., https://github.com/owner/repo).",
    };
  }

  // Enforce HTTPS or HTTP protocol
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      valid: false,
      error: "Only HTTP and HTTPS GitHub repository URLs are supported.",
    };
  }

  // Enforce GitHub host
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "github.com" && hostname !== "www.github.com") {
    return {
      valid: false,
      error: "Only GitHub (github.com) repositories are supported.",
    };
  }

  // Validate path pattern: /owner/repo or /owner/repo.git
  const pathParts = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (pathParts.length !== 2) {
    return {
      valid: false,
      error: "URL must point to a specific repository in the format https://github.com/owner/repository.",
    };
  }

  const [owner, rawRepo] = pathParts;
  const repo = rawRepo.endsWith(".git") ? rawRepo.slice(0, -4) : rawRepo;

  // Validate owner and repository characters (alphanumeric, dash, underscore, dot)
  const namePattern = /^[a-zA-Z0-9_.-]+$/;
  if (!namePattern.test(owner) || !namePattern.test(repo)) {
    return {
      valid: false,
      error: "Owner and repository names may only contain letters, numbers, dashes, dots, and underscores.",
    };
  }

  // Prevent argument injection (names starting with dash)
  if (owner.startsWith("-") || repo.startsWith("-")) {
    return {
      valid: false,
      error: "Repository and owner names cannot start with a dash.",
    };
  }

  // Prevent directory traversal tokens
  if (owner === ".." || owner === "." || repo === ".." || repo === ".") {
    return {
      valid: false,
      error: "Invalid repository path.",
    };
  }

  const normalizedUrl = `https://github.com/${owner}/${repo}`;
  const fullName = `${owner}/${repo}`;

  return {
    valid: true,
    normalizedUrl,
    owner,
    repo,
    fullName,
  };
}

export interface ClonedRepository {
  tempDir: string;
  fullName: string;
  normalizedUrl: string;
  cleanup: () => Promise<void>;
}

/**
 * Clones a public GitHub repository into an isolated temporary directory.
 * Uses a shallow clone (--depth 100) to keep cloning fast and resource-efficient.
 */
export function cloneGitHubRepository(
  rawUrl: string,
  options: { depth?: number; timeoutMs?: number } = {}
): Promise<ClonedRepository> {
  return new Promise((resolve, reject) => {
    const validation = validateGitHubUrl(rawUrl);
    if (!validation.valid || !validation.normalizedUrl || !validation.fullName) {
      reject(new Error(validation.error ?? "Invalid repository URL."));
      return;
    }

    const { normalizedUrl, fullName } = validation;
    const depth = options.depth ?? 100;
    const timeoutMs = options.timeoutMs ?? 60000;

    const baseTemp = path.join(os.tmpdir(), "repohealth-clones");
    try {
      if (!fs.existsSync(baseTemp)) {
        fs.mkdirSync(baseTemp, { recursive: true });
      }
    } catch (err) {
      reject(new Error(`Failed to create temp directory: ${err instanceof Error ? err.message : String(err)}`));
      return;
    }

    const uniqueId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const tempDir = path.join(baseTemp, `clone-${uniqueId}`);

    const cleanup = async () => {
      try {
        if (fs.existsSync(tempDir)) {
          await fs.promises.rm(tempDir, {
            recursive: true,
            force: true,
            maxRetries: 3,
            retryDelay: 300,
          });
        }
      } catch (err) {
        console.warn(`[Warning] Could not remove temporary clone dir ${tempDir}:`, err);
      }
    };

    const cloneUrl = `${normalizedUrl}.git`;
    const gitArgs = [
      "clone",
      "--depth",
      String(depth),
      "--single-branch",
      "--no-tags",
      cloneUrl,
      tempDir,
    ];

    execFile(
      "git",
      gitArgs,
      {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, _stdout, stderr) => {
        if (error) {
          void cleanup();
          const stderrLower = (stderr || "").toLowerCase();
          if (stderrLower.includes("repository not found") || stderrLower.includes("authentication failed")) {
            reject(
              new Error("Repository not found or private. Ensure the GitHub repository exists and is public.")
            );
            return;
          }
          if (stderrLower.includes("could not resolve host")) {
            reject(
              new Error("Network error: Unable to resolve github.com. Check your internet connection.")
            );
            return;
          }
          if (error.killed) {
            reject(
              new Error("Cloning timed out. The repository may be too large or the network is too slow.")
            );
            return;
          }
          reject(
            new Error(`Failed to clone repository: ${stderr.trim() || error.message}`)
          );
          return;
        }

        resolve({
          tempDir,
          fullName,
          normalizedUrl,
          cleanup,
        });
      }
    );
  });
}

