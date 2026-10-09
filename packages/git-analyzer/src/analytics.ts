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
