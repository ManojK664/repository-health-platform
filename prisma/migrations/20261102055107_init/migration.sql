-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCommits" INTEGER NOT NULL,
    "activeDays" INTEGER NOT NULL,
    "contributorCount" INTEGER NOT NULL,
    "totalFiles" INTEGER NOT NULL,
    "totalAdditions" INTEGER NOT NULL,
    "totalDeletions" INTEGER NOT NULL,
    "totalChurn" INTEGER NOT NULL,
    "estimatedBusFactor" INTEGER NOT NULL,
    "stagnantFiles" INTEGER NOT NULL,
    "healthScore" INTEGER NOT NULL,
    "healthRating" TEXT NOT NULL,
    "scoreBreakdown" JSONB NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contributor" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "commits" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Contributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commit" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "message" TEXT NOT NULL,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "churn" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Commit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Repository_path_key" ON "Repository"("path");

-- CreateIndex
CREATE INDEX "Analysis_repositoryId_analyzedAt_idx" ON "Analysis"("repositoryId", "analyzedAt");

-- CreateIndex
CREATE INDEX "Contributor_analysisId_idx" ON "Contributor"("analysisId");

-- CreateIndex
CREATE INDEX "Commit_analysisId_idx" ON "Commit"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "Commit_analysisId_hash_key" ON "Commit"("analysisId", "hash");

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contributor" ADD CONSTRAINT "Contributor_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commit" ADD CONSTRAINT "Commit_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
