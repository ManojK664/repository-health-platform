import type { Commit } from "./types.js";

export function getTotalCommits(commits: Commit[]): number {
  return commits.length;
}
export function getActiveDays(commits: Commit[]): number {
  const activeDays = new Set<string>();

  commits.forEach((commit) => {
    const day = commit.date.split("T")[0];
    activeDays.add(day);
  });

  return activeDays.size;
}
export function getAverageCommitsPerActiveDay(
  commits: Commit[]
): number {
  const activeDays = getActiveDays(commits);

  if (activeDays === 0) {
    return 0;
  }

  return commits.length / activeDays;
}
export function getCommitsByAuthor(
  commits: Commit[]
): Record<string, number> {
  const authorCounts: Record<string, number> = {};

  commits.forEach((commit) => {
    authorCounts[commit.authorName] =
      (authorCounts[commit.authorName] || 0) + 1;
  });

  return authorCounts;
}
export function getContributorCount(
  commits: Commit[]
): number {
  return Object.keys(getCommitsByAuthor(commits)).length;
}

export function getContributorPercentages(
  commits: Commit[]
): Record<string, number> {
  const authorCounts = getCommitsByAuthor(commits);
  const totalCommits = commits.length;

  const percentages: Record<string, number> = {};

  Object.entries(authorCounts).forEach(([author, count]) => {
    percentages[author] = (count / totalCommits) * 100;
  });

  return percentages;
}
export function getTopContributor(
  commits: Commit[]
): string | null {
  const authorCounts = getCommitsByAuthor(commits);

  const authors = Object.entries(authorCounts);

  if (authors.length === 0) {
    return null;
  }

  authors.sort((a, b) => b[1] - a[1]);

  return authors[0][0];
}


export function getRankedContributors(
  commits: Commit[]
): { author: string; commits: number; percentage: number }[] {
  const authorCounts = getCommitsByAuthor(commits);
  const totalCommits = commits.length;

  if (totalCommits === 0) {
    return [];
  }

  return Object.entries(authorCounts)
    .map(([author, count]) => ({
      author,
      commits: count,
      percentage: Number(
        ((count / totalCommits) * 100).toFixed(2)
      )
    }))
    .sort((a, b) => b.commits - a.commits);
}


export function getTotalAdditions(commits: Commit[]): number {
  return commits.reduce(
    (total, commit) =>
      total +
      commit.files.reduce(
        (fileTotal, file) => fileTotal + file.additions,
        0
      ),
    0
  );
}

export function getTotalDeletions(commits: Commit[]): number {
  return commits.reduce(
    (total, commit) =>
      total +
      commit.files.reduce(
        (fileTotal, file) => fileTotal + file.deletions,
        0
      ),
    0
  );
}

export function getTotalChurn(commits: Commit[]): number {
  return getTotalAdditions(commits) + getTotalDeletions(commits);
}


export function getChurnByFile(
  commits: Commit[]
): { path: string; additions: number; deletions: number; churn: number }[] {
  const fileStats: Record<
    string,
    { additions: number; deletions: number }
  > = {};

  commits.forEach((commit) => {
    commit.files.forEach((file) => {
      if (!fileStats[file.path]) {
        fileStats[file.path] = {
          additions: 0,
          deletions: 0
        };
      }

      fileStats[file.path].additions += file.additions;
      fileStats[file.path].deletions += file.deletions;
    });
  });

  return Object.entries(fileStats)
    .map(([path, stats]) => ({
      path,
      additions: stats.additions,
      deletions: stats.deletions,
      churn: stats.additions + stats.deletions
    }))
    .sort((a, b) => b.churn - a.churn);
}


export function getFileHotspots(
  commits: Commit[]
): {
  path: string;
  changes: number;
  additions: number;
  deletions: number;
  churn: number;
}[] {
  const fileStats: Record<
    string,
    {
      changes: number;
      additions: number;
      deletions: number;
    }
  > = {};

  commits.forEach((commit) => {
    commit.files.forEach((file) => {
      if (!fileStats[file.path]) {
        fileStats[file.path] = {
          changes: 0,
          additions: 0,
          deletions: 0
        };
      }

      fileStats[file.path].changes += 1;
      fileStats[file.path].additions += file.additions;
      fileStats[file.path].deletions += file.deletions;
    });
  });

  return Object.entries(fileStats)
    .map(([path, stats]) => ({
      path,
      changes: stats.changes,
      additions: stats.additions,
      deletions: stats.deletions,
      churn: stats.additions + stats.deletions
    }))
    .sort(
      (a, b) =>
        b.changes - a.changes || b.churn - a.churn
    );
}


export function getFileStagnation(
  commits: Commit[],
  asOfDate: Date = new Date()
): {
  path: string;
  lastChanged: string;
  daysSinceLastChange: number;
}[] {
  const lastChangedByFile: Record<string, string> = {};

  commits.forEach((commit) => {
    commit.files.forEach((file) => {
      const previousDate = lastChangedByFile[file.path];

      if (
        !previousDate ||
        new Date(commit.date).getTime() >
          new Date(previousDate).getTime()
      ) {
        lastChangedByFile[file.path] = commit.date;
      }
    });
  });

  return Object.entries(lastChangedByFile)
    .map(([path, lastChanged]) => {
      const millisecondsPerDay = 1000 * 60 * 60 * 24;

      const difference =
        asOfDate.getTime() -
        new Date(lastChanged).getTime();

      return {
        path,
        lastChanged,
        daysSinceLastChange: Math.max(
          0,
          Math.floor(difference / millisecondsPerDay)
        )
      };
    })
    .sort(
      (a, b) =>
        b.daysSinceLastChange - a.daysSinceLastChange
    );
}



export function getFileOwnership(
  commits: Commit[]
): {
  path: string;
  totalCommits: number;
  contributors: {
    author: string;
    commits: number;
    percentage: number;
  }[];
  topContributor: string | null;
  topContributorPercentage: number;
  estimatedBusFactor: number;
}[] {
  const fileStats: Record<string, Record<string, number>> = {};

  commits.forEach((commit) => {
    commit.files.forEach((file) => {
      if (!fileStats[file.path]) {
        fileStats[file.path] = {};
      }

      const author = commit.authorName;

      fileStats[file.path][author] =
        (fileStats[file.path][author] || 0) + 1;
    });
  });

  return Object.entries(fileStats)
    .map(([path, authorCounts]) => {
      const contributors = Object.entries(authorCounts)
        .map(([author, count]) => ({
          author,
          commits: count,
          percentage: 0
        }))
        .sort((a, b) => b.commits - a.commits);

      const totalCommits = contributors.reduce(
        (total, contributor) => total + contributor.commits,
        0
      );

      contributors.forEach((contributor) => {
        contributor.percentage = Number(
          ((contributor.commits / totalCommits) * 100).toFixed(2)
        );
      });

      const topContributor = contributors[0]?.author ?? null;
      const topContributorPercentage =
        contributors[0]?.percentage ?? 0;

      let accumulatedCommits = 0;
      let estimatedBusFactor = 0;

      for (const contributor of contributors) {
        accumulatedCommits += contributor.commits;
        estimatedBusFactor += 1;

        if (accumulatedCommits >= totalCommits / 2) {
          break;
        }
      }

      return {
        path,
        totalCommits,
        contributors,
        topContributor,
        topContributorPercentage,
        estimatedBusFactor
      };
    })
    .sort(
      (a, b) =>
        a.estimatedBusFactor - b.estimatedBusFactor ||
        b.topContributorPercentage - a.topContributorPercentage
    );
}
