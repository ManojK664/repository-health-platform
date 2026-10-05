export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
}

export interface Commit {
  hash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  files: FileChange[];
}