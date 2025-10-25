-- CreateTable
CREATE TABLE "votes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reportId" INTEGER NOT NULL,
    "voterAddress" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "votes_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenId" BIGINT,
    "ownerId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "metadataURI" TEXT,
    "mintedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "badges_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" INTEGER NOT NULL,
    "proposerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "onchainId" BIGINT,
    "status" TEXT NOT NULL,
    "snapshot" DATETIME,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "proposals_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "proposals_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "proposal_votes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "voterId" INTEGER NOT NULL,
    "onchainTx" TEXT,
    "choice" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "proposal_votes_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "proposal_votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "votes_reportId_idx" ON "votes"("reportId");

-- CreateIndex
CREATE INDEX "votes_voterAddress_idx" ON "votes"("voterAddress");

-- CreateIndex
CREATE UNIQUE INDEX "votes_reportId_voterAddress_key" ON "votes"("reportId", "voterAddress");

-- CreateIndex
CREATE INDEX "badges_ownerId_idx" ON "badges"("ownerId");

-- CreateIndex
CREATE INDEX "badges_tokenId_idx" ON "badges"("tokenId");

-- CreateIndex
CREATE INDEX "proposals_reportId_idx" ON "proposals"("reportId");

-- CreateIndex
CREATE INDEX "proposals_proposerId_idx" ON "proposals"("proposerId");

-- CreateIndex
CREATE INDEX "proposals_onchainId_idx" ON "proposals"("onchainId");

-- CreateIndex
CREATE INDEX "proposal_votes_proposalId_idx" ON "proposal_votes"("proposalId");

-- CreateIndex
CREATE INDEX "proposal_votes_voterId_idx" ON "proposal_votes"("voterId");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_votes_proposalId_voterId_key" ON "proposal_votes"("proposalId", "voterId");
